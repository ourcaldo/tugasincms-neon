'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApiTokenSetup } from '@/components/settings/api-token-setup'
import { Settings, User, Key, FileText, Megaphone } from 'lucide-react'
import Link from 'next/link'

const settingsPages = [
  {
    title: 'Profile',
    description: 'Update your profile information and preferences',
    href: '/settings/profile',
    icon: User,
  },
  {
    title: 'API Tokens',
    description: 'Manage API access tokens for external integrations',
    href: '/settings/tokens',
    icon: Key,
  },
  {
    title: 'Custom Post Types',
    description: 'Configure custom content types for your site',
    href: '/settings/custom-post-types',
    icon: FileText,
  },
  {
    title: 'Advertisements',
    description: 'Manage popup ads and advertisement codes',
    href: '/settings/advertisements',
    icon: Megaphone,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your CMS configuration and preferences
        </p>
      </div>

      {/* API Token Setup */}
      <ApiTokenSetup />

      {/* Settings Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings Categories
          </CardTitle>
          <CardDescription>
            Choose a category to configure specific settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingsPages.map((page) => {
              const Icon = page.icon
              return (
                <Link key={page.href} href={page.href}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{page.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {page.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}