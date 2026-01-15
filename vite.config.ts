import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import basicSsl from "@vitejs/plugin-basic-ssl"

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ".", "")

    return {
        plugins: [
            react(),
            basicSsl(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['icons/*.png', 'favicon.ico'],
                manifest: {
                    name: '타슈 최적 경로 찾기',
                    short_name: 'TASHU',
                    description: '대전시 공공자전거 타슈의 최적 경로를 찾아주는 PWA 앱',
                    theme_color: '#2563eb',
                    background_color: '#e0e5ec',
                    display: 'standalone',
                    start_url: '/',
                    icons: [
                        {
                            src: '/icons/icon-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any maskable',
                        },
                        {
                            src: '/icons/icon-512x512.png',
                            sizes: '512x512',
                            type: 'image/png',
                            purpose: 'any maskable',
                        },
                    ],
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'openstreetmap-tiles',
                                expiration: {
                                    maxEntries: 100,
                                    maxAgeSeconds: 60 * 60 * 24 * 7,
                                },
                            },
                        },
                        {
                            urlPattern: /\/.netlify\/functions\/.*/i,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-cache',
                                networkTimeoutSeconds: 10,
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 5,
                                },
                            },
                        },
                    ],
                },
                devOptions: {
                    enabled: true,
                },
            }),
        ],
        define: {
            "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        base: "/",
        server: {
            host: true,
            port: 5173,
            proxy: {
                "/api/tashu": {
                    target: "https://bikeapp.tashu.or.kr:50041",
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api\/tashu/, "/v1/openapi"),
                },
                "/api/kakao": {
                    target: "https://dapi.kakao.com",
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api\/kakao/, ""),
                },
                "/naver": {
                    target: "https://maps.apigw.ntruss.com/map-geocode/v2/geocode",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/naver/, ""),
                },
            },
        },
    }
})
