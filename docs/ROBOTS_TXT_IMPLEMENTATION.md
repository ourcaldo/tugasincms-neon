# Robots.txt Settings Implementation

## Overview
This implementation adds robots.txt management functionality to the TugasCMS backend system, allowing administrators to configure how search engines crawl the Nexjob frontend.

## What's Implemented

### 1. Database Schema ✅
- **File**: `database/robots-settings-migration.sql`
- **Table**: `robots_settings`
- **Features**:
  - Stores robots.txt content as TEXT
  - Automatic timestamp updates with triggers
  - Default robots.txt content optimized for Nexjob

### 2. API Endpoints ✅
- **Files**: 
  - `app/api/v1/settings/seo/route.ts` - Robots.txt settings management
  - `app/api/v1/robots.txt/route.ts` - Public robots.txt serving (updated)
- **Endpoints**:
  - `GET /api/v1/settings/seo` - Retrieve current robots.txt settings
  - `PUT /api/v1/settings/seo` - Update robots.txt content
  - `OPTIONS /api/v1/settings/seo` - CORS preflight
  - `GET /api/v1/robots.txt` - Serve robots.txt file (now reads from database)
- **Features**:
  - Bearer token authentication (for settings)
  - Public robots.txt endpoint (no auth required)
  - CORS support
  - Input validation
  - Error handling
  - Database integration with fallback
  - Caching (1 hour for robots.txt)

### 3. Admin Interface ✅
- **File**: `app/(dashboard)/settings/robots/page.tsx`
- **Features**:
  - Large textarea for robots.txt content editing
  - Real-time change detection
  - Save/Reset functionality
  - View current robots.txt in new tab
  - Guidelines and best practices
  - Toast notifications for feedback
  - API token integration
  - Loading and saving states

### 4. Navigation Integration ✅
- **Files**: 
  - `app/(dashboard)/settings/page.tsx` - Settings overview page (updated)
  - `components/layout/app-sidebar.tsx` - Sidebar navigation (updated)
- **Features**:
  - Robots.txt settings accessible from main settings page
  - Sidebar navigation includes robots.txt link with Bot icon
  - Proper tooltips and descriptions

## API Usage Examples

### Get Robots.txt Settings
```bash
curl -X GET "https://cms.nexjob.tech/api/v1/settings/seo" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "robots_txt": "User-agent: *\nAllow: /\n...",
    "updated_at": "2024-01-06T10:30:00Z"
  }
}
```

### Update Robots.txt Settings
```bash
curl -X PUT "https://cms.nexjob.tech/api/v1/settings/seo" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "robots_txt": "User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://nexjob.tech/sitemap.xml"
  }'
```

### Get Public Robots.txt
```bash
curl -X GET "https://cms.nexjob.tech/api/v1/robots.txt"
```

**Response:**
```
User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: https://nexjob.tech/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*
Disallow: /search?

# Crawl delay for politeness
Crawl-delay: 1
```

## Database Migration

Run the following SQL in your Neon database console:

```sql
-- Create robots.txt settings table
CREATE TABLE IF NOT EXISTS robots_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robots_txt TEXT DEFAULT 'User-agent: *...',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes and triggers
CREATE INDEX IF NOT EXISTS idx_robots_settings_updated_at ON robots_settings(updated_at);
CREATE TRIGGER update_robots_settings_updated_at 
    BEFORE UPDATE ON robots_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO robots_settings (robots_txt) VALUES (...) ON CONFLICT DO NOTHING;
```

## UI Features

### Robots.txt Editor
- **Large Textarea**: Monospace font for easy editing
- **Real-time Validation**: Immediate feedback on changes
- **Change Detection**: Save button only enabled when changes exist
- **Reset Functionality**: Quick reset to default content
- **External Preview**: View current robots.txt in new tab

### Guidelines Section
- **Common Directives**: Explanation of User-agent, Allow, Disallow, etc.
- **Best Practices**: Important notes about implementation
- **Syntax Help**: Examples and usage patterns

### User Experience
- **Loading States**: Spinner while fetching data
- **Saving States**: Button shows saving progress
- **Toast Notifications**: Success/error feedback
- **Responsive Design**: Works on all screen sizes

## Integration with Nexjob Frontend

### How It Works
1. **CMS Admin** edits robots.txt content in the dashboard
2. **Database Storage** saves the content in `robots_settings` table
3. **API Serving** `/api/v1/robots.txt` reads from database with caching
4. **Nexjob Frontend** requests robots.txt from CMS API
5. **Search Engines** crawl robots.txt from nexjob.tech domain

### Caching Strategy
- **1 Hour Cache** for robots.txt content
- **Fallback Content** if database fails
- **Cache Invalidation** when settings are updated (planned)

## Default Robots.txt Content

The default robots.txt is optimized for Nexjob:

```
User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: https://nexjob.tech/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*
Disallow: /search?

# Crawl delay for politeness
Crawl-delay: 1
```

## Security Considerations

### Authentication
- **Admin Interface**: Requires Clerk authentication
- **API Endpoints**: Require valid API token
- **Public Serving**: No authentication (as expected for robots.txt)

### Validation
- **Content Validation**: Ensures robots.txt content is not empty
- **Input Sanitization**: Prevents malicious content injection
- **Error Handling**: Graceful fallbacks for all failure scenarios

## Testing

### Manual Testing Checklist
- [ ] Navigate to `/settings/robots` in dashboard
- [ ] Edit robots.txt content and save
- [ ] Verify changes appear in `/api/v1/robots.txt`
- [ ] Test reset to default functionality
- [ ] Verify external preview opens correctly
- [ ] Test with invalid API token
- [ ] Test database connection failure scenarios

### API Testing
```bash
# Test getting settings
curl -X GET "http://localhost:3000/api/v1/settings/seo" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test updating settings
curl -X PUT "http://localhost:3000/api/v1/settings/seo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"robots_txt": "User-agent: *\nAllow: /"}'

# Test public robots.txt
curl -X GET "http://localhost:3000/api/v1/robots.txt"
```

## Future Enhancements

### Potential Improvements
1. **Syntax Validation**: Real-time robots.txt syntax checking
2. **Preview Mode**: Live preview of how robots.txt will look
3. **Version History**: Track changes to robots.txt over time
4. **Template System**: Pre-built robots.txt templates
5. **Cache Invalidation**: Automatic cache clearing on updates

### Integration Opportunities
1. **Google Search Console**: Integration for testing robots.txt
2. **Analytics**: Track robots.txt access patterns
3. **Notifications**: Alert when robots.txt is accessed frequently
4. **Backup**: Automatic backup of robots.txt changes

## Troubleshooting

### Common Issues
1. **Changes Not Appearing**: Check cache expiration (1 hour)
2. **API Token Errors**: Verify token is valid and has correct permissions
3. **Database Errors**: Check database connection and table existence
4. **Syntax Errors**: Validate robots.txt syntax using online tools

### Debug Mode
Enable debug logging in the API endpoints to troubleshoot issues:
```typescript
console.log('Robots.txt content:', robotsTxt)
console.log('Database query result:', settings)
console.log('Cache status:', cachedData ? 'HIT' : 'MISS')
```

## References

- [Robots.txt Specification](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- [Google Search Console Robots.txt Tester](https://search.google.com/search-console/robots-txt)
- [Robots.txt Best Practices](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)