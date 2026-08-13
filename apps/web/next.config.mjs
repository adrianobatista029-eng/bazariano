/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@marketplace/supabase", "@marketplace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
