import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { verifyApiToken, extractBearerToken, getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    // Check if request is from dashboard (Clerk auth) or external API (Bearer token)
    const token = extractBearerToken(request)
    
    // If token provided, verify it (external API access)
    if (token) {
      const validToken = await verifyApiToken(token)
      
      if (!validToken) {
        return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
      }
    } else {
      // If no token, check Clerk auth (dashboard access)
      const userId = await getUserIdFromClerk()
      
      if (!userId) {
        return setCorsHeaders(unauthorizedResponse('Authentication required'), origin)
      }
    }
    
    // Fetch advertisement settings
    const settings = await sql`
      SELECT * FROM advertisement_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    if (settings.length === 0) {
      // Return default settings if none exist
      const defaultSettings = {
        popup_ad: {
          enabled: false,
          url: '',
          load_settings: [],
          max_executions: 0,
          device: 'all'
        },
        ad_codes: {
          sidebar_archive: '',
          sidebar_single: '',
          single_top: '',
          single_bottom: '',
          single_middle: ''
        }
      }
      
      return setCorsHeaders(successResponse(defaultSettings, false), origin)
    }
    
    const setting = settings[0]
    
    // Transform database format to API format
    const responseData = {
      popup_ad: {
        enabled: setting.popup_ad_enabled,
        url: setting.popup_ad_url,
        load_settings: setting.popup_ad_load_settings || [],
        max_executions: setting.popup_ad_max_executions,
        device: setting.popup_ad_device
      },
      ad_codes: {
        sidebar_archive: setting.sidebar_archive_ad_code,
        sidebar_single: setting.sidebar_single_ad_code,
        single_top: setting.single_top_ad_code,
        single_bottom: setting.single_bottom_ad_code,
        single_middle: setting.single_middle_ad_code
      },
      updated_at: setting.updated_at
    }
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error fetching advertisement settings:', error)
    return setCorsHeaders(errorResponse('Failed to fetch advertisement settings'), origin)
  }
}

export async function PUT(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    // Check if request is from dashboard (Clerk auth) or external API (Bearer token)
    const token = extractBearerToken(request)
    
    // If token provided, verify it (external API access)
    if (token) {
      const validToken = await verifyApiToken(token)
      
      if (!validToken) {
        return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
      }
    } else {
      // If no token, check Clerk auth (dashboard access)
      const userId = await getUserIdFromClerk()
      
      if (!userId) {
        return setCorsHeaders(unauthorizedResponse('Authentication required'), origin)
      }
    }
    
    const body = await request.json()
    
    // Validate request body
    if (!body.popup_ad || !body.ad_codes) {
      return setCorsHeaders(errorResponse('Invalid request body. Expected popup_ad and ad_codes objects.'), origin)
    }
    
    const { popup_ad, ad_codes } = body
    
    // Validate popup_ad fields
    if (typeof popup_ad.enabled !== 'boolean') {
      return setCorsHeaders(errorResponse('popup_ad.enabled must be a boolean'), origin)
    }
    
    if (popup_ad.max_executions < 0 || popup_ad.max_executions > 10) {
      return setCorsHeaders(errorResponse('popup_ad.max_executions must be between 0 and 10'), origin)
    }
    
    if (!['all', 'mobile', 'desktop'].includes(popup_ad.device)) {
      return setCorsHeaders(errorResponse('popup_ad.device must be one of: all, mobile, desktop'), origin)
    }
    
    // Check if settings exist
    const existingSettings = await sql`
      SELECT id FROM advertisement_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    
    if (existingSettings.length === 0) {
      // Insert new settings
      await sql`
        INSERT INTO advertisement_settings (
          popup_ad_enabled,
          popup_ad_url,
          popup_ad_load_settings,
          popup_ad_max_executions,
          popup_ad_device,
          sidebar_archive_ad_code,
          sidebar_single_ad_code,
          single_top_ad_code,
          single_bottom_ad_code,
          single_middle_ad_code
        ) VALUES (
          ${popup_ad.enabled},
          ${popup_ad.url || ''},
          ${JSON.stringify(popup_ad.load_settings || [])},
          ${popup_ad.max_executions || 0},
          ${popup_ad.device || 'all'},
          ${ad_codes.sidebar_archive || ''},
          ${ad_codes.sidebar_single || ''},
          ${ad_codes.single_top || ''},
          ${ad_codes.single_bottom || ''},
          ${ad_codes.single_middle || ''}
        )
      `
    } else {
      // Update existing settings
      const settingId = existingSettings[0].id
      await sql`
        UPDATE advertisement_settings SET
          popup_ad_enabled = ${popup_ad.enabled},
          popup_ad_url = ${popup_ad.url || ''},
          popup_ad_load_settings = ${JSON.stringify(popup_ad.load_settings || [])},
          popup_ad_max_executions = ${popup_ad.max_executions || 0},
          popup_ad_device = ${popup_ad.device || 'all'},
          sidebar_archive_ad_code = ${ad_codes.sidebar_archive || ''},
          sidebar_single_ad_code = ${ad_codes.sidebar_single || ''},
          single_top_ad_code = ${ad_codes.single_top || ''},
          single_bottom_ad_code = ${ad_codes.single_bottom || ''},
          single_middle_ad_code = ${ad_codes.single_middle || ''},
          updated_at = now()
        WHERE id = ${settingId}
      `
    }
    
    const responseData = {
      message: 'Advertisement settings updated successfully',
      updated_at: new Date().toISOString()
    }
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error updating advertisement settings:', error)
    return setCorsHeaders(errorResponse('Failed to update advertisement settings'), origin)
  }
}