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
    // The PDF library loads its built-in fonts by a path the tracer cannot follow.
    "/hiring-test/results/[assessmentId]/pdf": [
      "./assets/fonts/*.ttf",
      "./assets/hiring/mark.png",
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
};

export default nextConfig;
