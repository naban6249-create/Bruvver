/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/dtlfxjl13/**',
      },
      {
        protocol: 'https',
        hostname: 'bruvver-backend.onrender.com',
        port: '',
        pathname: '/static/images/**',
      },
    ],
    // Don't fail on upstream errors
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Show placeholder on error
    unoptimized: false,
  },
};

export default nextConfig;
