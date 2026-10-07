import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import basicSsl from "@vitejs/plugin-basic-ssl"

export default defineConfig(() => {
    return {
        plugins: [
            react(),
            basicSsl(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['icons/*.png', 'icons/*.svg'],
                manifest: {
                    name: '공공자전거 최적 경로 찾기',
                    short_name: '공공자전거',
                    description: '대전시 공공자전거 타슈의 최적 경로를 찾아주는 PWA 앱',
                    theme_color: '#FF9A24',
                    background_color: '#f5f7fa',
                    display: 'standalone',
                    start_url: '/PUBLIC-BIKE-ROUTE-FINDER/',
                    icons: [
                        {
                            src: '/PUBLIC-BIKE-ROUTE-FINDER/icons/icon-192x192.png',
                            sizes: '192x192',
                            type: 'image/png',
                            purpose: 'any maskable',
                        },
                        {
                            src: '/PUBLIC-BIKE-ROUTE-FINDER/icons/icon-512x512.png',
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
                            // VWorld 배경지도 타일 (키 미설정 시 대체용 OSM 타일 포함)
                            urlPattern: /^https:\/\/(api\.vworld\.kr\/req\/wmts\/|.*\.tile\.openstreetmap\.org\/)/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'map-tiles',
                                expiration: {
                                    maxEntries: 500,
                                    maxAgeSeconds: 60 * 60 * 24 * 7,
                                },
                            },
                        },
                        {
                            urlPattern: /\/data\/(seoul-)?stations\.json/i,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'stations-cache',
                                networkTimeoutSeconds: 10,
                                expiration: {
                                    maxEntries: 2, // 대전·서울 파일
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
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        base: "/PUBLIC-BIKE-ROUTE-FINDER/",
        server: {
            host: true,
            port: 5173,
        },
    }
})
