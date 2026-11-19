/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["googleapis", "@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
