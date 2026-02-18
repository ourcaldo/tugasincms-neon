// H-20: This page is deprecated. Robots.txt management is consolidated into /settings/seo.
import { redirect } from 'next/navigation'

export default function RobotsSettingsPage() {
  redirect('/settings/seo')
}
