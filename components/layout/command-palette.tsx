'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  File,
  Briefcase,
  Settings,
  Tags,
  FolderKanban,
  Users,
  Award,
  GraduationCap,
  Key,
  Megaphone,
  Bot,
  LayoutDashboard,
  Image,
  Plus,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Navigate' },
  { label: 'All Posts', href: '/posts', icon: FileText, group: 'Content' },
  { label: 'All Pages', href: '/pages', icon: File, group: 'Content' },
  { label: 'All Job Posts', href: '/job-posts', icon: Briefcase, group: 'Content' },
  { label: 'Categories', href: '/categories', icon: FolderKanban, group: 'Content' },
  { label: 'Tags', href: '/tags', icon: Tags, group: 'Content' },
  { label: 'Job Categories', href: '/job-categories', icon: FolderKanban, group: 'Job Settings' },
  { label: 'Job Tags', href: '/job-tags', icon: Tags, group: 'Job Settings' },
  { label: 'Employment Types', href: '/employment-types', icon: Users, group: 'Job Settings' },
  { label: 'Experience Levels', href: '/experience-levels', icon: Award, group: 'Job Settings' },
  { label: 'Education Levels', href: '/education-levels', icon: GraduationCap, group: 'Job Settings' },
  { label: 'Media Library', href: '/media', icon: Image, group: 'Management' },
  { label: 'Profile', href: '/settings/profile', icon: Settings, group: 'Settings' },
  { label: 'API Tokens', href: '/settings/tokens', icon: Key, group: 'Settings' },
  { label: 'Custom Post Types', href: '/settings/custom-post-types', icon: FileText, group: 'Settings' },
  { label: 'Advertisements', href: '/settings/advertisements', icon: Megaphone, group: 'Settings' },
  { label: 'SEO Settings', href: '/settings/seo', icon: Bot, group: 'Settings' },
]

const quickActions = [
  { label: 'Create New Post', href: '/posts/new', icon: Plus },
  { label: 'Create New Page', href: '/pages/new', icon: Plus },
  { label: 'Create New Job Post', href: '/job-posts/new', icon: Plus },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  // Global Cmd+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange],
  )

  const groups = Array.from(new Set(navigationItems.map((i) => i.group)))

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search for pages, settings, or actions"
    >
      <CommandInput placeholder="Type to search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => runCommand(() => router.push(item.href))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {navigationItems
              .filter((item) => item.group === group)
              .map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
