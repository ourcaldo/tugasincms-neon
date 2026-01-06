'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Search, FileText, BarChart3, Globe, RefreshCw } from 'lucide-react'
import { getApiToken } from '@/lib/api-token-client'

interface SeoSettings {
  robots_txt: string
  sitemap_update_interval: number
  auto_generate_sitemap: boolean
  default_meta_title: string
  default_meta_description: string
  default_og_image: string
  google_analytics_id: string
  google_tag_manager_id: string
  last_sitemap_update: string | null
  updated_at: string
}

const defaultRobotsTxt = `User-agent: *
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

export default function SeoSettingsPage() {
  const [settings, setSettings] = useState<SeoSettings>({
    robots_txt: defaultRobotsTxt,
    sitemap_update_interval: 60,
    auto_generate_sitemap: true,
    default_meta_title: '',
    default_meta_description: '',
    default_og_image: '',
    google_analytics_id: '',
    google_tag_manager_id: '',
    last_sitemap_update: null,
    updated_at: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = getApiToken()
      if (!token) {
        toast({
          title: 'Authentication Required',
          description: 'Please set up your API token first.',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/v1/settings/seo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch SEO settings')
      }

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error('Error fetching SEO settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load SEO settings. Using defaults.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = getApiToken()
      if (!token) {
        toast({
          title: 'Authentication Required',
          description: 'Please set up your API token first.',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/v1/settings/seo', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save SEO settings')
      }

      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
        toast({
          title: 'Success',
          description: 'SEO settings saved successfully!'
        })
      }
    } catch (error: any) {
      console.error('Error saving SEO settings:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SEO settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(prev => ({
      ...prev,
      robots_txt: defaultRobotsTxt
    }))
    toast({
      title: 'Reset',
      description: 'Robots.txt content reset to default'
    })
  }

  const handleInputChange = (field: keyof SeoSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="w-8 h-8" />
          SEO Settings
        </h1>
        <p className="text-muted-foreground">
          Manage search engine optimization settings, robots.txt, and meta defaults
        </p>
      </div>

      {/* Robots.txt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Robots.txt Configuration
          </CardTitle>
          <CardDescription>
            Configure how search engines crawl your site. This content is served at /api/v1/robots.txt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="robots-txt">Robots.txt Content</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                Reset to Default
              </Button>
            </div>
            <Textarea
              id="robots-txt"
              value={settings.robots_txt}
              onChange={(e) => handleInputChange('robots_txt', e.target.value)}
              placeholder="Enter robots.txt content..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              This content will be served at <code className="bg-muted px-1 py-0.5 rounded">https://nexjob.tech/robots.txt</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sitemap Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Sitemap Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic sitemap generation and update intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-generate Sitemap</Label>
              <p className="text-sm text-muted-foreground">
                Automatically update sitemap when content changes
              </p>
            </div>
            <Switch
              checked={settings.auto_generate_sitemap}
              onCheckedChange={(checked) => handleInputChange('auto_generate_sitemap', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="sitemap-interval">Update Interval (minutes)</Label>
            <Input
              id="sitemap-interval"
              type="number"
              min="5"
              max="1440"
              value={settings.sitemap_update_interval}
              onChange={(e) => handleInputChange('sitemap_update_interval', parseInt(e.target.value) || 60)}
              placeholder="60"
            />
            <p className="text-sm text-muted-foreground">
              How often to check for sitemap updates (5-1440 minutes)
            </p>
          </div>

          {settings.last_sitemap_update && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              Last updated: {new Date(settings.last_sitemap_update).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Default Meta Tags
          </CardTitle>
          <CardDescription>
            Set default meta tags for pages that don't have custom SEO settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-title">Default Meta Title</Label>
            <Input
              id="meta-title"
              value={settings.default_meta_title}
              onChange={(e) => handleInputChange('default_meta_title', e.target.value)}
              placeholder="Your Site Title"
              maxLength={200}
            />
            <p className="text-sm text-muted-foreground">
              {settings.default_meta_title.length}/200 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-description">Default Meta Description</Label>
            <Textarea
              id="meta-description"
              value={settings.default_meta_description}
              onChange={(e) => handleInputChange('default_meta_description', e.target.value)}
              placeholder="A brief description of your site..."
              maxLength={500}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              {settings.default_meta_description.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og-image">Default Open Graph Image</Label>
            <Input
              id="og-image"
              type="url"
              value={settings.default_og_image}
              onChange={(e) => handleInputChange('default_og_image', e.target.value)}
              placeholder="https://example.com/og-image.jpg"
            />
            <p className="text-sm text-muted-foreground">
              Image shown when your site is shared on social media
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics Integration
          </CardTitle>
          <CardDescription>
            Configure Google Analytics and Tag Manager tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga-id">Google Analytics ID</Label>
            <Input
              id="ga-id"
              value={settings.google_analytics_id}
              onChange={(e) => handleInputChange('google_analytics_id', e.target.value)}
              placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              Your Google Analytics measurement ID
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gtm-id">Google Tag Manager ID</Label>
            <Input
              id="gtm-id"
              value={settings.google_tag_manager_id}
              onChange={(e) => handleInputChange('google_tag_manager_id', e.target.value)}
              placeholder="GTM-XXXXXXX"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              Your Google Tag Manager container ID
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {settings.updated_at && (
            <>
              Last saved: {new Date(settings.updated_at).toLocaleString()}
            </>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save SEO Settings
        </Button>
      </div>
    </div>
  )
}