'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CustomPostType {
  id: string
  slug: string
  name: string
  singular_name: string
  plural_name: string
  description: string | null
  icon: string
  is_enabled: boolean
  menu_position: number
}

export function CustomPostTypesSettings() {
  const [postTypes, setPostTypes] = useState<CustomPostType[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchPostTypes()
  }, [])

  const fetchPostTypes = async () => {
    try {
      const response = await fetch('/api/settings/custom-post-types')
      const result = await response.json()
      
      if (result.success) {
        setPostTypes(result.data)
      } else {
        toast.error('Failed to fetch custom post types')
      }
    } catch (error) {
      toast.error('Failed to fetch custom post types')
    } finally {
      setLoading(false)
    }
  }

  const togglePostType = async (slug: string, currentState: boolean) => {
    if (slug === 'post') {
      toast.error('Cannot disable the default post type')
      return
    }

    setUpdating(slug)
    
    try {
      const response = await fetch(`/api/settings/custom-post-types/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentState })
      })

      const result = await response.json()

      if (result.success) {
        setPostTypes(prev =>
          prev.map(pt =>
            pt.slug === slug ? { ...pt, is_enabled: !currentState } : pt
          )
        )
        toast.success(`${result.data.name} ${!currentState ? 'enabled' : 'disabled'}`)
      } else {
        toast.error(result.error || 'Failed to update custom post type')
      }
    } catch (error) {
      toast.error('Failed to update custom post type')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Custom Post Types</h3>
        <p className="text-sm text-muted-foreground">
          Enable or disable custom post types for your CMS.
        </p>
      </div>

      <div className="space-y-4">
        {postTypes.map((postType) => (
          <Card key={postType.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>{postType.name}</CardTitle>
                  <CardDescription>{postType.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={postType.is_enabled}
                    onCheckedChange={() =>
                      togglePostType(postType.slug, postType.is_enabled)
                    }
                    disabled={postType.slug === 'post' || updating === postType.slug}
                  />
                  {updating === postType.slug && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Singular Name</Label>
                  <p className="font-medium">{postType.singular_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plural Name</Label>
                  <p className="font-medium">{postType.plural_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
