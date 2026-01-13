import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    logging: {
        fetches: {
            fullUrl: true,
            hmrRefreshes: true
        }
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'web-cdn.bsky.app',
                port: '',
                search: '',
            },
        ],
    },
};

export default nextConfig;
