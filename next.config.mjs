/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a verification build run beside `next dev` without sharing .next (NEXT_DIST_DIR=.next-verify).
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
