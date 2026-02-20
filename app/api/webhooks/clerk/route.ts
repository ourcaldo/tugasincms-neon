import { NextRequest } from 'next/server'
import { Webhook } from 'svix'
import { sql } from '@/lib/database'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/response'

// Clerk sends webhooks signed with Svix.
// CLERK_WEBHOOK_SECRET must be set in .env from the Clerk dashboard.

interface ClerkUserEvent {
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
    phone_numbers: Array<{ phone_number: string; id: string }>
  }
  type: string
}

/**
 * Insert an audit row into webhook_logs.
 */
async function logWebhookEvent(opts: {
  eventType: string
  eventId: string | null
  clerkUserId: string | null
  payload: string
  status: 'success' | 'error'
  errorMessage?: string | null
  ipAddress: string | null
  processingMs: number
}) {
  try {
    await sql`
      INSERT INTO webhook_logs
        (event_type, event_id, source, status, clerk_user_id, payload, error_message, ip_address, processing_ms)
      VALUES
        (${opts.eventType}, ${opts.eventId}, 'clerk', ${opts.status},
         ${opts.clerkUserId}, ${opts.payload}::jsonb, ${opts.errorMessage ?? null},
         ${opts.ipAddress}, ${opts.processingMs})
    `
  } catch (logErr) {
    // Never let audit logging break the webhook response
    console.error('Failed to write webhook audit log:', logErr)
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return errorResponse('Webhook secret not configured')
  }

  // Get Svix headers for verification
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    // Log failed attempt (missing headers)
    await logWebhookEvent({
      eventType: 'unknown',
      eventId: svixId,
      clerkUserId: null,
      payload: '{}',
      status: 'error',
      errorMessage: 'Missing Svix headers',
      ipAddress,
      processingMs: Date.now() - startTime,
    })
    return validationErrorResponse('Missing Svix headers')
  }

  const body = await request.text()

  // Verify the webhook signature
  const wh = new Webhook(webhookSecret)
  let event: ClerkUserEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    await logWebhookEvent({
      eventType: 'unknown',
      eventId: svixId,
      clerkUserId: null,
      payload: body,
      status: 'error',
      errorMessage: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      ipAddress,
      processingMs: Date.now() - startTime,
    })
    return validationErrorResponse('Invalid signature')
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const email = data.email_addresses?.[0]?.email_address || ''
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null
        const avatar = data.image_url || null
        const phone = data.phone_numbers?.[0]?.phone_number || null

        await sql`
          INSERT INTO users (id, email, name, avatar, phone, role)
          VALUES (${data.id}, ${email}, ${name}, ${avatar}, ${phone}, 'user')
          ON CONFLICT (id)
          DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, users.name),
            avatar = COALESCE(EXCLUDED.avatar, users.avatar),
            phone = COALESCE(EXCLUDED.phone, users.phone),
            updated_at = NOW()
        `
        // Note: role is NOT overwritten on update — only set on initial creation.
        // COALESCE ensures we don't blank out fields the user may have edited in their profile.
        break
      }

      case 'user.deleted': {
        if (data.id) {
          await sql`DELETE FROM users WHERE id = ${data.id}`
        }
        break
      }

      default:
        // Ignore other event types but still log them
        break
    }

    // Log successful processing
    await logWebhookEvent({
      eventType: type,
      eventId: svixId,
      clerkUserId: data.id || null,
      payload: body,
      status: 'success',
      ipAddress,
      processingMs: Date.now() - startTime,
    })

    return successResponse({ received: true })
  } catch (error) {
    console.error(`Webhook error processing ${type}:`, error)

    // Log failure
    await logWebhookEvent({
      eventType: type,
      eventId: svixId,
      clerkUserId: data.id || null,
      payload: body,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
      ipAddress,
      processingMs: Date.now() - startTime,
    })

    return errorResponse('Failed to process webhook')
  }
}
