# Advertisement Settings Implementation

## Overview
This implementation adds advertisement management functionality to the TugasCMS backend system to support the Nexjob frontend migration from Supabase.

## What's Implemented

### 1. Database Schema ✅
- **File**: `database/advertisement-settings-migration.sql`
- **Table**: `advertisement_settings`
- **Features**:
  - Popup advertisement settings (enabled, URL, load settings, max executions, device targeting)
  - Advertisement codes for different positions (sidebar archive/single, single top/middle/bottom)
  - Automatic timestamp updates with triggers
  - Data validation constraints

### 2. API Endpoints ✅
- **Files**: 
  - `app/api/v1/settings/advertisements/route.ts` - Advertisement settings
  - `app/api/v1/robots.txt/route.ts` - Robots.txt serving
- **Endpoints**:
  - `GET /api/v1/settings/advertisements` - Retrieve current settings
  - `PUT /api/v1/settings/advertisements` - Update settings
  - `OPTIONS /api/v1/settings/advertisements` - CORS preflight
  - `GET /api/v1/robots.txt` - Serve robots.txt file
- **Features**:
  - Bearer token authentication (for settings)
  - Public robots.txt endpoint (no auth required)
  - CORS support
  - Input validation
  - Error handling
  - Database integration
  - Caching (1 hour for robots.txt)

### 3. Admin Interface ✅
- **File**: `app/(dashboard)/settings/advertisements/page.tsx`
- **Features**:
  - Popup advertisement configuration form
  - Advertisement code management (5 different positions)
  - Real-time form validation
  - API token integration
  - Toast notifications
  - Reset to defaults functionality
  - Clear individual ad codes

### 4. Navigation Integration ✅
- **Files**: 
  - `app/(dashboard)/settings/page.tsx` - Settings overview page
  - `components/layout/app-sidebar.tsx` - Sidebar navigation
- **Features**:
  - Advertisement settings accessible from main settings page
  - Sidebar navigation includes advertisements link
  - Proper tooltips and descriptions

### 5. Supporting Infrastructure ✅
- **Files**:
  - `lib/api-token-client.ts` - API client for v1 endpoints
  - `hooks/use-toast.ts` - Toast notifications
  - `components/settings/api-token-setup.tsx` - API token management
- **Features**:
  - Token-based authentication for admin interface
  - Proper error handling and user feedback
  - Local storage for token persistence

## API Usage Examples

### Get Advertisement Settings
```bash
curl -X GET "https://cms.nexjob.tech/api/v1/settings/advertisements" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Update Advertisement Settings
```bash
curl -X PUT "https://cms.nexjob.tech/api/v1/settings/advertisements" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "popup_ad": {
      "enabled": true,
      "url": "https://example.com/promo",
      "load_settings": ["single_articles"],
      "max_executions": 3,
      "device": "all"
    },
    "ad_codes": {
      "sidebar_archive": "<script>/* Archive ad code */</script>",
      "single_top": "<div class=\"ad\"><!-- Top ad --></div>"
    }
  }'
```

### Get Robots.txt
```bash
curl -X GET "https://cms.nexjob.tech/api/v1/robots.txt"
```

## Database Migration

Run the following SQL in your Neon database console:

```sql
-- See database/advertisement-settings-migration.sql for complete migration
```

## Integration with Nexjob Frontend

### Advertisement Settings
The Nexjob frontend can fetch advertisement settings using:

```javascript
// In Nexjob middleware or components
const response = await fetch('https://cms.nexjob.tech/api/v1/settings/advertisements', {
  headers: {
    'Authorization': `Bearer ${process.env.CMS_API_TOKEN}`
  }
});

const { data } = await response.json();

// Use data.popup_ad and data.ad_codes in your frontend
```

### Robots.txt Integration
The Nexjob middleware now pulls robots.txt from the CMS:

```javascript
// In Nexjob middleware.ts - already implemented
if (pathname === '/robots.txt') {
  try {
    const response = await fetch(`${appConfig.cms.endpoint}/api/v1/robots.txt`, {
      signal: AbortSignal.timeout(appConfig.cms.timeout),
    });

    if (response.ok) {
      const robotsTxt = await response.text();
      return new NextResponse(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': `public, max-age=${appConfig.cache.sitemapTtl / 1000}`,
        },
      });
    }
  } catch (error) {
    // Fallback robots.txt is served
  }
}
```

## Security Features

- ✅ Bearer token authentication required
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ SQL injection prevention
- ✅ Rate limiting (inherited from existing API infrastructure)

## Testing Checklist

- [ ] Run database migration
- [ ] Generate API token in CMS admin
- [ ] Test GET endpoint returns default settings
- [ ] Test PUT endpoint updates settings
- [ ] Test admin interface loads and saves correctly
- [ ] Test integration with Nexjob frontend
- [ ] Verify authentication works properly
- [ ] Test error handling for invalid data

## Status: ✅ COMPLETE

All required functionality for advertisement settings management has been implemented and is ready for deployment.