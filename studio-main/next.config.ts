import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = 'http://127.0.0.1:8000'; // The internal URL for your Python backend

    return [
      {
        // This rule proxies any request from /api/... to your Python backend
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        // This rule proxies requests for static images to your Python backend
        source: '/static/:path*',
        destination: `${backendUrl}/static/:path*`,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
};

export default nextConfig;
