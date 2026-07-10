import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    optimizeServerReact: true,
    optimizeCss: true,
    scrollRestoration: true,
  },
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*.ts': ['node_modules/.prisma/**/*', 'node_modules/@prisma/**/*'],
  },
};

export default nextConfig;
