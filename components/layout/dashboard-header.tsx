'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { Moon, Sun, Search } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useClerk } from '@clerk/nextjs'
import { useRole } from '@/components/role-provider'

const routeLabels: Record<string, string> = {
  posts: 'Posts',
  pages: 'Pages',
  categories: 'Categories',
  tags: 'Tags',
  'job-posts': 'Job Posts',
  'job-categories': 'Job Categories',
  'job-tags': 'Job Tags',
  'employment-types': 'Employment Types',
  'experience-levels': 'Experience Levels',
  'education-levels': 'Education Levels',
  settings: 'Settings',
  profile: 'Profile',
  tokens: 'API Tokens',
  'custom-post-types': 'Custom Post Types',
  advertisements: 'Advertisements',
  robots: 'Robots.txt',
  seo: 'SEO',
  media: 'Media Library',
  dashboard: 'Dashboard',
  new: 'New',
  edit: 'Edit',
}

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    // Skip UUID-like segments (edit IDs) — show "Edit" instead
    if (segment.match(/^[0-9a-f-]{20,}$/i)) continue
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({ label, href: currentPath })
  }

  return crumbs
}

interface DashboardHeaderProps {
  onOpenSearch?: () => void
}

export function DashboardHeader({ onOpenSearch }: DashboardHeaderProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { theme, setTheme } = useTheme()
  const role = useRole()

  const crumbs = buildBreadcrumbs(pathname || '/')

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
      <SidebarTrigger className="-ml-2" />
      <Separator orientation="vertical" className="h-6" />

      {/* Breadcrumbs */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {!isLast ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search trigger */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground"
          onClick={onOpenSearch}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User'} />
                <AvatarFallback className="text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center gap-2 p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium">{user?.fullName || 'User'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile Settings</Link>
            </DropdownMenuItem>
            {role === 'super_admin' && (
              <DropdownMenuItem asChild>
                <Link href="/settings/tokens">API Tokens</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
