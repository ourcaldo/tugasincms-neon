'use client'

import { useClerk } from '@clerk/nextjs'
import { ShieldAlert } from 'lucide-react'

export default function AccessDeniedPage() {
  const { signOut } = useClerk()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Akses Ditolak</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Akun Anda tidak memiliki izin untuk mengakses dashboard CMS.
            Hubungi administrator untuk mendapatkan akses.
          </p>
        </div>

        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Keluar & Kembali ke Login
        </button>
      </div>
    </div>
  )
}
