import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed build error ignoring for production safety
  // All TypeScript and ESLint errors must be fixed before deployment
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // Image optimization
  images: {
    domains: ['bbtgrbcznxwfsfkwnfdu.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Webpack configuration for proper PDF.js handling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle canvas dependency for server-side builds
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;
