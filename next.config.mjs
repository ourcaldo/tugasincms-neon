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
    // H-21: Enforce ESLint checks during builds
    ignoreDuringBuilds: false,
  },
  output: 'standalone',
}

export default nextConfig
