interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  // Role checks are handled at the individual page level.
  // super_admin-only pages (tokens, custom-post-types, advertisements, seo)
  // each perform their own server-side role check and redirect non-super_admins.
  return <>{children}</>
}
