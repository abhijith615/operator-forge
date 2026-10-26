import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The certificate and the candidate PDF are drawn on the server from these files; make sure the
  // deployed function carries them.
  outputFileTracingIncludes: {
    "/challenge/certificate/download": ["./assets/fonts/*.ttf", "./public/logo.png"],
    "/hiring-test/results/[assessmentId]/pdf": ["./assets/fonts/*.ttf", "./assets/hiring/mark.png"],
  },
};

export default nextConfig;
