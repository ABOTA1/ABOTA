/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8000"}/api/:path*`,
      },
      {
        source: "/metrics/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8000"}/metrics/:path*`,
      },
    ];
  },
};

export default nextConfig;
