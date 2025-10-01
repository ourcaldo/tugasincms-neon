import { ReactNode } from 'react';
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onNavigate?: (href: string) => void;
}

export function DashboardLayout({ children, activeItem, onNavigate }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeItem={activeItem} onNavigate={onNavigate} />
        <main className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 border-b px-6 py-3">
            <SidebarTrigger />
            <h1 className="text-lg font-medium">Content Management System</h1>
          </div>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}