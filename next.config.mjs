/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'vm-80ofx10lztf592n2gseajay5.vusercontent.net',
    'localhost',
    '127.0.0.1',
    '::1',
  ],
}

export default nextConfig
