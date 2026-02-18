'use client'

import { ReactNode, useState } from 'react';
import { SidebarProvider } from '../ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { DashboardHeader } from './dashboard-header';
import { CommandPalette } from './command-palette';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader onOpenSearch={() => setSearchOpen(true)} />
          <div className="flex-1 overflow-auto">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}