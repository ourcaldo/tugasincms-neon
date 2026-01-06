'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { useApiTokenClient } from '@/lib/api-token-client'
import { Loader2, Save, RotateCcw, Eye, Trash2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PopupAdSettings {
  enabled: boolean
  url: string
  load_settings: string[]
  max_executions: number
  device: string
}

interface AdCodes {
  sidebar_archive: string
  sidebar_single: string
  single_top: string
  single_bottom: string
  single_middle: string
}

interface AdvertisementSettings {
  popup_ad: PopupAdSettings
  ad_codes: AdCodes
  updated_at?: string
}

const defaultSettings: AdvertisementSettings = {
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

export default function AdvertisementSettingsPage() {
  const [settings, setSettings] = useState<AdvertisementSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const apiClient = useApiTokenClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    if (!apiClient.hasToken()) {
      toast({
        title: 'API Token Required',
        description: 'Please configure an API token in the API Tokens settings first.',
        variant: 'destructive'
      })
      setLoading(false)
      return
    }

    try {
      const response = await apiClient.get<{data: AdvertisementSettings}>('/settings/advertisements')
      setSettings(response.data || defaultSettings)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load advertisement settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!apiClient.hasToken()) {
      toast({
        title: 'API Token Required',
        description: 'Please configure an API token in the API Tokens settings first.',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      await apiClient.put('/settings/advertisements', settings)
      toast({
        title: 'Success',
        description: 'Advertisement settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all advertisement settings to defaults?')) {
      setSettings(defaultSettings)
    }
  }

  const updatePopupAd = (field: keyof PopupAdSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      popup_ad: {
        ...prev.popup_ad,
        [field]: value
      }
    }))
  }

  const updateAdCode = (field: keyof AdCodes, value: string) => {
    setSettings(prev => ({
      ...prev,
      ad_codes: {
        ...prev.ad_codes,
        [field]: value
      }
    }))
  }

  const clearAdCode = (field: keyof AdCodes) => {
    updateAdCode(field, '')
  }

  const getApiToken = () => {
    // In a real implementation, this would come from your auth system
    // For now, return a placeholder - you'll need to implement proper token management
    return 'your-api-token-here'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!apiClient.hasToken()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Advertisement Settings</h1>
          <p className="text-muted-foreground">
            Manage popup advertisements and ad codes for your website
          </p>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            API token required. Please go to <strong>Settings → API Tokens</strong> to generate an API token first, 
            then refresh this page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Advertisement Settings</h1>
        <p className="text-muted-foreground">
          Manage popup advertisements and ad codes for your website
        </p>
      </div>

      {/* Popup Advertisement Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Popup Advertisement</CardTitle>
          <CardDescription>
            Configure popup advertisement behavior and targeting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="popup-enabled"
              checked={settings.popup_ad.enabled}
              onCheckedChange={(checked) => updatePopupAd('enabled', checked)}
            />
            <Label htmlFor="popup-enabled">Enable Popup Ads</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="popup-url">Popup URL</Label>
            <Input
              id="popup-url"
              type="url"
              placeholder="https://example.com/promo"
              value={settings.popup_ad.url}
              onChange={(e) => updatePopupAd('url', e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Load Settings</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="load-all-pages"
                  checked={settings.popup_ad.load_settings.includes('all_pages')}
                  onCheckedChange={(checked) => {
                    const current = settings.popup_ad.load_settings
                    const updated = checked
                      ? [...current, 'all_pages']
                      : current.filter(s => s !== 'all_pages')
                    updatePopupAd('load_settings', updated)
                  }}
                />
                <Label htmlFor="load-all-pages">All Pages</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="load-single-articles"
                  checked={settings.popup_ad.load_settings.includes('single_articles')}
                  onCheckedChange={(checked) => {
                    const current = settings.popup_ad.load_settings
                    const updated = checked
                      ? [...current, 'single_articles']
                      : current.filter(s => s !== 'single_articles')
                    updatePopupAd('load_settings', updated)
                  }}
                />
                <Label htmlFor="load-single-articles">Single Articles</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-executions">Max Executions per Page</Label>
            <Input
              id="max-executions"
              type="number"
              min="0"
              max="10"
              value={settings.popup_ad.max_executions}
              onChange={(e) => updatePopupAd('max_executions', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-3">
            <Label>Target Device</Label>
            <RadioGroup
              value={settings.popup_ad.device}
              onValueChange={(value) => updatePopupAd('device', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="device-all" />
                <Label htmlFor="device-all">All Devices</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mobile" id="device-mobile" />
                <Label htmlFor="device-mobile">Mobile Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="desktop" id="device-desktop" />
                <Label htmlFor="device-desktop">Desktop Only</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Advertisement Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Advertisement Codes</CardTitle>
          <CardDescription>
            Manage HTML/JavaScript advertisement codes for different positions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { key: 'sidebar_archive' as keyof AdCodes, label: 'Sidebar Archive Ad', description: 'Displayed in sidebar on archive pages' },
            { key: 'sidebar_single' as keyof AdCodes, label: 'Sidebar Single Ad', description: 'Displayed in sidebar on single post pages' },
            { key: 'single_top' as keyof AdCodes, label: 'Single Top Ad', description: 'Displayed at the top of single posts' },
            { key: 'single_middle' as keyof AdCodes, label: 'Single Middle Ad', description: 'Displayed in the middle of single posts' },
            { key: 'single_bottom' as keyof AdCodes, label: 'Single Bottom Ad', description: 'Displayed at the bottom of single posts' }
          ].map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor={key}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearAdCode(key)}
                    disabled={!settings.ad_codes[key]}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                id={key}
                placeholder={`Enter ${label.toLowerCase()} HTML/JavaScript code...`}
                value={settings.ad_codes[key]}
                onChange={(e) => updateAdCode(key, e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>

      {settings.updated_at && (
        <Alert>
          <AlertDescription>
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}