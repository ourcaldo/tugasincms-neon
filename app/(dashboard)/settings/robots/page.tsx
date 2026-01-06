'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, FileText, RotateCcw, ExternalLink, Save } from 'lucide-react'
import { toast } from 'sonner'
import { getApiToken } from '@/lib/api-token-client'

interface RobotsSettings {
  robots_txt: string
  updated_at?: string
}

const DEFAULT_ROBOTS_TXT = `User-agent: *
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
Crawl-delay: 1`

export default function RobotsSettingsPage() {
  const [settings, setSettings] = useState<RobotsSettings>({
    robots_txt: DEFAULT_ROBOTS_TXT
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = getApiToken()
      if (!token) {
        toast.error('API token not found. Please set up your API token first.')
        return
      }

      const response = await fetch('/api/v1/settings/seo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch robots.txt settings')
      }

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        setHasChanges(false)
      } else {
        throw new Error(data.error || 'Failed to fetch settings')
      }
    } catch (error) {
      console.error('Error fetching robots.txt settings:', error)
      toast.error('Failed to load robots.txt settings')
      // Use default settings on error
      setSettings({ robots_txt: DEFAULT_ROBOTS_TXT })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = getApiToken()
      if (!token) {
        toast.error('API token not found. Please set up your API token first.')
        return
      }

      const response = await fetch('/api/v1/settings/seo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robots_txt: settings.robots_txt
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save robots.txt settings')
      }

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        setHasChanges(false)
        toast.success('Robots.txt settings saved successfully!')
      } else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving robots.txt settings:', error)
      toast.error('Failed to save robots.txt settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({ robots_txt: DEFAULT_ROBOTS_TXT })
    setHasChanges(true)
    toast.info('Reset to default robots.txt content')
  }

  const handleRobotsTxtChange = (value: string) => {
    setSettings(prev => ({ ...prev, robots_txt: value }))
    setHasChanges(true)
  }

  const handleViewRobotsTxt = () => {
    window.open('/api/v1/robots.txt', '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Robots.txt Settings</h1>
        <p className="text-muted-foreground">
          Configure your robots.txt file to control how search engines crawl your site
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Robots.txt Content
          </CardTitle>
          <CardDescription>
            Edit the robots.txt content that will be served to search engine crawlers.
            This file tells search engines which pages they can and cannot crawl.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="robots-txt">Robots.txt Content</Label>
            <Textarea
              id="robots-txt"
              value={settings.robots_txt}
              onChange={(e) => handleRobotsTxtChange(e.target.value)}
              placeholder="Enter robots.txt content..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Use standard robots.txt syntax. Each directive should be on a new line.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>

            <Button 
              variant="outline" 
              onClick={handleViewRobotsTxt}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Current Robots.txt
            </Button>
          </div>

          {settings.updated_at && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Robots.txt Guidelines</CardTitle>
          <CardDescription>
            Best practices for configuring your robots.txt file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Common Directives:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li><code>User-agent: *</code> - Applies to all search engines</li>
                <li><code>Allow: /path/</code> - Explicitly allows crawling of a path</li>
                <li><code>Disallow: /path/</code> - Prevents crawling of a path</li>
                <li><code>Sitemap: https://example.com/sitemap.xml</code> - Points to your sitemap</li>
                <li><code>Crawl-delay: 1</code> - Adds delay between requests (in seconds)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Important Notes:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Changes take effect immediately after saving</li>
                <li>• Search engines may take time to recognize changes</li>
                <li>• Use wildcards (*) carefully as they may not work in all crawlers</li>
                <li>• The sitemap URL should point to your frontend domain (nexjob.tech)</li>
                <li>• Test your robots.txt using Google Search Console</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}