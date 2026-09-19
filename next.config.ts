import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // The certificate is drawn on the server from these files; make sure the
  // deployed function carries them.
  outputFileTracingIncludes: {
    "/challenge/certificate/download": ["./assets/fonts/*.ttf", "./public/logo.png"],
  },
};

export default nextConfig;
