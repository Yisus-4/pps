import type { NextConfig } from "next";

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = isVercel
  ? {
      output: "export",
      images: {
        unoptimized: true,
      },
    }
  : {
      images: {
        unoptimized: true,
      },
      async rewrites() {
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        return [
          {
            source: "/api/:path*",
            destination: `${backendUrl}/api/:path*`,
          },
        ];
      },
    };

export default nextConfig;
