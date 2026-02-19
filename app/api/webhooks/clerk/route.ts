import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { sql } from '@/lib/database'

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

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Get Svix headers for verification
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
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
        // Ignore other event types
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error(`Webhook error processing ${type}:`, error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
