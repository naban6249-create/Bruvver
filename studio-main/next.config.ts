/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // It's good practice to keep this
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
        pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/**`,
      },
      // You can add other domains here in the future if needed
    ],
  },
};

export default nextConfig;
