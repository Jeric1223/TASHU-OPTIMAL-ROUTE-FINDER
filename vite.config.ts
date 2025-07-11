import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ".", "");
    return {
        define: {
            "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
            "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "."),
            },
        },
        server: {
            host: true,
            port: 5173,
            proxy: {
                "/api": {
                    target: "https://bikeapp.tashu.or.kr:50041/v1/openapi/station",
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api/, ""),
                },
                "/naver": {
                    target: "https://maps.apigw.ntruss.com/map-geocode/v2/geocode",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/naver/, ""),
                },
                "/kakao": {
                    target: "https://dapi.kakao.com/v2/local/search/keyword.json",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/kakao/, ""),
                },
            },
        },
    };
});
