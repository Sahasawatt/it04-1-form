/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Profile images are stored as Base64 data URLs in the JSON body, so allow a
  // generous body size for the route handler parsing.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
