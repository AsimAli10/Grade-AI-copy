/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "begjeguienmqpmrcokud.supabase.co",
      },
    ],
  },
};

export default nextConfig;

