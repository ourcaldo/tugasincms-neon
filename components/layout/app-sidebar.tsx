'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  FileText,
  Settings,
  PlusCircle,
  BarChart3,
  User,
  LogOut,
  Briefcase,
  FolderKanban,
  Tags,
  Users,
  Award,
  GraduationCap,
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
} from '../ui/sidebar';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface CustomPostType {
  slug: string;
  name: string;
  is_enabled: boolean;
}

const baseMenuItems = [
  {
    title: 'Posts and Pages',
    icon: FileText,
    items: [
      { title: 'All Posts', href: '/posts', tooltip: 'View and manage all blog posts' },
      { title: 'All Pages', href: '/pages', tooltip: 'View and manage all pages' },
      { title: 'Categories', href: '/categories', tooltip: 'Organize posts with categories' },
      { title: 'Tags', href: '/tags', tooltip: 'Manage post tags for better organization' },
    ],
  },
  {
    title: 'Management',
    icon: BarChart3,
    items: [
      { title: 'Media Library', href: '/media', tooltip: 'Upload and manage images and files' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { title: 'Profile', href: '/settings/profile', tooltip: 'Update your profile information' },
      { title: 'API Tokens', href: '/settings/tokens', tooltip: 'Manage API access tokens' },
      { title: 'Custom Post Types', href: '/settings/custom-post-types', tooltip: 'Manage custom post types' },
      { title: 'Advertisements', href: '/settings/advertisements', tooltip: 'Manage advertisement settings and codes' },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [customPostTypes, setCustomPostTypes] = useState<CustomPostType[]>([]);
  const [menuItems, setMenuItems] = useState(baseMenuItems);

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
        setCustomPostTypes(enabled);
        
        // Build dynamic menu items (exclude 'post' as it's already in baseMenuItems)
        const dynamicMenus = enabled
          .filter((cpt: CustomPostType) => cpt.slug !== 'post')
          .map((cpt: CustomPostType) => {
            const capitalizedName = cpt.name.charAt(0).toUpperCase() + cpt.name.slice(1);
            // Fix double "Post" issue - if name already ends with "Post", don't add it again
            const menuTitle = capitalizedName.endsWith('Post') ? capitalizedName : `${capitalizedName} Posts`;
            const allItemsTitle = capitalizedName.endsWith('Post') ? `All ${capitalizedName}s` : `All ${capitalizedName} Posts`;
            
            // Build base items
            const baseItems: any[] = [
              { 
                title: allItemsTitle, 
                href: `/${cpt.slug}-posts`, 
                tooltip: `View and manage all ${cpt.name} posts` 
              },
            ];
            
            // Add job-specific items if this is the job CPT
            if (cpt.slug === 'job') {
              baseItems.push(
                { title: 'Job Categories', href: '/job-categories', icon: FolderKanban, tooltip: 'Manage job categories' },
                { title: 'Job Tags', href: '/job-tags', icon: Tags, tooltip: 'Manage job tags' },
                { title: 'Employment Types', href: '/employment-types', icon: Users, tooltip: 'Manage employment types' },
                { title: 'Experience Levels', href: '/experience-levels', icon: Award, tooltip: 'Manage experience levels' },
                { title: 'Education Levels', href: '/education-levels', icon: GraduationCap, tooltip: 'Manage education level requirements' }
              );
            }
            
            return {
              title: menuTitle,
              icon: cpt.slug === 'job' ? Briefcase : FileText,
              items: baseItems,
            };
          });

        // Insert dynamic menus after Posts section
        const newMenuItems = [
          baseMenuItems[0], // Posts
          ...dynamicMenus,
          baseMenuItems[1], // Management
          baseMenuItems[2], // Settings
        ];
        setMenuItems(newMenuItems);
      }
    } catch (error) {
      console.error('Error fetching custom post types:', error);
    }
  };

  return (
    <TooltipProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">TugasCMS</h2>
              <p className="text-sm text-muted-foreground">Content Management</p>
            </div>
          </div>
        </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="flex items-center gap-2">
              <group.icon className="w-4 h-4" />
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item: any) => {
                  const ItemIcon = item.icon;
                  const isActive = pathname === item.href || 
                                 (item.href === '/posts' && pathname?.startsWith('/posts'));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton 
                            asChild
                            isActive={isActive}
                          >
                            <Link href={item.href}>
                              {ItemIcon && <ItemIcon className="w-4 h-4" />}
                              {item.title}
                            </Link>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}