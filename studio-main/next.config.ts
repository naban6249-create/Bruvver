/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**', // allows all Unsplash images
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        // Replace <your-cloud-name> with your actual Cloudinary cloud name
        pathname: '/dtlfxjl13/**',
      },
    ],
  },
};

export default nextConfig;
