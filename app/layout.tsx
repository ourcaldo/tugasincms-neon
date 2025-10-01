import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/src/components/theme-provider'
import { Toaster } from '@/src/components/ui/sonner'
import '@/src/styles/globals.css'

export const metadata = {
  title: 'Build Professional CMS',
  description: 'Content Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider defaultTheme="system" storageKey="tugascms-theme">
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
