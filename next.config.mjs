/** @type {import('next').NextConfig} */

// For GitHub Pages project sites the app is served from /<repo>.
// Set NEXT_PUBLIC_BASE_PATH=/GRID-STELLA in CI; leave empty for Vercel/local.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Fully client-side game → static HTML export. Works on GitHub Pages,
  // Vercel, Netlify, or any static host.
  output: 'export',
  basePath,
  images: { unoptimized: true },
  // Emit /path/index.html so static hosts resolve routes without a server.
  trailingSlash: true,
};

export default nextConfig;
