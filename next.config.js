const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@vercel/postgres'] = path.resolve(
      __dirname,
      'lib/pg-shim.js'
    );
    return config;
  },
};

module.exports = nextConfig;
