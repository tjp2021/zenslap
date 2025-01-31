/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      loader: 'null-loader',
    })

    // Exclude problematic packages from client bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'chromadb': false,
        'chromadb-default-embed': false,
        '@xenova/transformers': false,
      }
    }

    return config
  },
}

module.exports = nextConfig 