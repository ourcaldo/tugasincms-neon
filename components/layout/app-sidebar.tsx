'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  File,
  LayoutDashboard,
  Briefcase,
  FolderKanban,
  Tags,
  Users,
  Award,
  GraduationCap,
  Image,
  User,
  Key,
  Megaphone,
  Bot,
  type LucideIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '../ui/sidebar';

interface CustomPostType {
  slug: string;
  name: string;
  is_enabled: boolean;
}

interface MenuItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const baseMenuItems: MenuGroup[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Content',
    items: [
      { title: 'Posts', href: '/posts', icon: FileText },
      { title: 'Pages', href: '/pages', icon: File },
      { title: 'Categories', href: '/categories', icon: FolderKanban },
      { title: 'Tags', href: '/tags', icon: Tags },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Media Library', href: '/media', icon: Image },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'Profile', href: '/settings/profile', icon: User },
      { title: 'API Tokens', href: '/settings/tokens', icon: Key },
      { title: 'Custom Post Types', href: '/settings/custom-post-types', icon: FileText },
      { title: 'Advertisements', href: '/settings/advertisements', icon: Megaphone },
      { title: 'SEO & Robots', href: '/settings/seo', icon: Bot },
    ],
  },
];

function isRouteActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  // For top-level routes, check starts-with but avoid false positives
  // e.g. /posts/new should highlight /posts, but /posts shouldn't highlight /pages
  if (href !== '/dashboard' && pathname.startsWith(href + '/')) return true;
  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<MenuGroup[]>(baseMenuItems);

  useEffect(() => {
    fetchCustomPostTypes();
  }, []);

  const fetchCustomPostTypes = async () => {
    try {
      const response = await fetch('/api/settings/custom-post-types');
      if (response.ok) {
        const data = await response.json();
        const cpts = data.data || data || [];
        const enabled = cpts.filter((cpt: CustomPostType) => cpt.is_enabled);
        
        const dynamicMenus: MenuGroup[] = enabled
          .filter((cpt: CustomPostType) => cpt.slug !== 'post')
          .map((cpt: CustomPostType) => {
            const capitalizedName = cpt.name.charAt(0).toUpperCase() + cpt.name.slice(1);
            const menuTitle = capitalizedName.endsWith('Post') ? `${capitalizedName}s` : `${capitalizedName} Posts`;
            
            const items: MenuItem[] = [
              { title: menuTitle, href: `/${cpt.slug}-posts`, icon: cpt.slug === 'job' ? Briefcase : FileText },
            ];
            
            if (cpt.slug === 'job') {
              items.push(
                { title: 'Job Categories', href: '/job-categories', icon: FolderKanban },
                { title: 'Job Tags', href: '/job-tags', icon: Tags },
                { title: 'Employment Types', href: '/employment-types', icon: Users },
                { title: 'Experience Levels', href: '/experience-levels', icon: Award },
                { title: 'Education Levels', href: '/education-levels', icon: GraduationCap },
              );
            }
            
            return {
              title: cpt.slug === 'job' ? 'Job Board' : capitalizedName,
              items,
            };
          });

        setMenuItems([
          baseMenuItems[0], // Overview
          baseMenuItems[1], // Content
          ...dynamicMenus,
          baseMenuItems[2], // Management
          baseMenuItems[3], // Settings
        ]);
      }
    } catch (error) {
      console.error('Error fetching custom post types:', error);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">TugasCMS</span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const active = isRouteActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href}>
                          {ItemIcon && <ItemIcon className="h-4 w-4" />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">TugasCMS v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}