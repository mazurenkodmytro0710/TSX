/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // All pages are dynamic (auth-gated app)
  experimental: {
    serverActions: {},
  },
};

export default nextConfig;
