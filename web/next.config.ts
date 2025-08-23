import type { NextConfig } from "next";

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "3001";
const backendUrl = `http://localhost:${backendPort}`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/graphql",
        destination: `${backendUrl}/graphql`,
      },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;