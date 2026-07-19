/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Episode artwork is proxied through our own API/CDN layer in front of
    // R2 — see lib/audio.ts and §9 of the product spec. Add the real CDN
    // hostname here once it exists.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.techmedng.com',
      },
    ],
  },
};

export default nextConfig;
