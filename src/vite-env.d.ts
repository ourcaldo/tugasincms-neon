/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string
  readonly VITE_APPWRITE_PROJECT_ID: string
  readonly VITE_BUCKET_ID: string
  readonly VITE_BUCKET_NAME: string
  readonly VITE_CLERK_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
