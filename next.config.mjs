/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true, // Ensure all URLs end with trailing slash
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint is enforced via pre-commit hook (Husky + lint-staged)
    // and npm run lint (eslint CLI), not during next build
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
}

export default nextConfig
