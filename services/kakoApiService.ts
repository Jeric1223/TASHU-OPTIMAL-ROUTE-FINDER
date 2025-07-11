import type { LocationSearchResult } from "../types";

// API 호출은 이제 우리의 Netlify 서버리스 함수를 통해 이루어집니다.
const API_ENDPOINT = "/.netlify/functions/search";

/**
 * 백엔드 서버리스 함수를 호출하여 위치를 검색합니다.
 * 이 함수는 내부적으로 Kakao 키워드 검색 API를 호출합니다.
 * 이 접근 방식은 API 키를 서버에 안전하게 보관합니다.
 * @param query - 검색어 (주소 또는 장소 이름).
 * @returns 검색 결과 배열을 담은 프로미스.
 */
export const searchKakaoLocation = async (query: string): Promise<LocationSearchResult[]> => {
    if (!query) {
        return [];
    }

    // 현재 window.location을 기준으로 절대 경로를 생성합니다.
    const searchUrl = new URL(API_ENDPOINT, window.location.origin);
    searchUrl.searchParams.append("query", query);

    try {
        const response = await fetch(searchUrl.toString());
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.message || `API 요청에 실패했습니다. (상태 코드: ${response.status})`;
            throw new Error(errorMessage);
        }

        // 서버리스 함수가 이미 데이터를 올바른 형식으로 가공했으므로, 그대로 반환합니다.
        return data as LocationSearchResult[];
    } catch (error) {
        console.error("검색 API 함수 호출 중 오류 발생:", error);
        if (error instanceof Error) {
            throw new Error(`장소 검색 중 오류가 발생했습니다: ${error.message}`);
        }
        throw new Error("장소 검색 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
};
