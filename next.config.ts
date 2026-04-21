import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    // Server Actions are on by default in Next 15
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lehvbwmvxguoczfmxcxp.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default config;
