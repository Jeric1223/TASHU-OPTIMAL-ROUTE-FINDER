import type { KakaoSearchResult, KakaoKeywordSearchResponse, KakaoDocument } from "../types/index";

/**
 * Searches for a location using Kakao's Keyword Search API.
 * Uses Vite proxy in dev, Netlify Function in production.
 * @param query - The search query (address or place name).
 * @returns A promise that resolves to an array of search results.
 */
export const searchKakaoLocation = async (query: string): Promise<KakaoSearchResult[]> => {
    if (!query) {
        return [];
    }

    try {
        // @ts-ignore - Vite 환경변수
        const isDev = import.meta.env?.DEV;
        // @ts-ignore - Vite 환경변수
        const kakaoApiKey = import.meta.env?.VITE_KAKAO_API_KEY as string;

        let response: Response;

        if (isDev) {
            // 개발 환경: Vite 프록시 사용
            response = await fetch(`/api/kakao/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Authorization": `KakaoAK ${kakaoApiKey}`
                }
            });
        } else {
            // 프로덕션: Netlify 함수 사용
            response = await fetch(`/.netlify/functions/kakao-search?query=${encodeURIComponent(query)}`, {
                method: "GET",
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API 요청에 실패했습니다. (상태 코드: ${response.status})`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData?.message || errorMessage;
                console.error("Kakao API Error Response:", errorData);
            } catch (e) {
                console.error("Failed to parse error response as JSON:", errorText);
            }
            throw new Error(`Kakao API 오류: ${errorMessage}`);
        }

        const data: KakaoKeywordSearchResponse = await response.json();

        if (!data.documents || data.documents.length === 0) {
            return [];
        }

        const results: KakaoSearchResult[] = data.documents.map((item: KakaoDocument) => ({
            name: item.place_name,
            address: item.address_name,
            roadAddress: item.road_address_name,
            coords: {
                latitude: parseFloat(item.y),
                longitude: parseFloat(item.x),
            },
        }));

        return results;
    } catch (error) {
        console.error("Error calling Kakao Keyword Search API:", error);
        if (error instanceof Error) {
            throw new Error(`장소 검색 중 오류가 발생했습니다: ${error.message}`);
        }
        throw new Error("장소 검색 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
};
