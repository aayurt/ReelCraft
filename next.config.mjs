/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000",
          },
        ],
      },
    ];
  },
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;