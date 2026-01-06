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
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
}

export default nextConfig
