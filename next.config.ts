import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/extension-accelerate',
  ],
};

export default nextConfig;
