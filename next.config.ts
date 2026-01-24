import type {NextConfig} from "next";

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
            {
                protocol: 'https',
                hostname: 'cdn.bsky.app',
                port: '',
            },
            {
                protocol: 'https',
                hostname: 'bing.com',
            }
        ],
    },
    devIndicators: false,
    turbopack: {},
    webpack: (config, {dev, isServer}) => {
        if (dev && !isServer) {
            // This effectively disables the HMR client-side connection
            config.entry = async () => {
                const entries = await (typeof config.entry === 'function' ? config.entry() : config.entry);
                if (entries['main-app'] || entries['main']) {
                    const target = entries['main-app'] ? 'main-app' : 'main';
                    entries[target] = entries[target].filter(
                        (entry: string) => !entry.includes('webpack-hmr')
                    );
                }
                return entries;
            };
        }
        return config;
    }
};

export default nextConfig;
