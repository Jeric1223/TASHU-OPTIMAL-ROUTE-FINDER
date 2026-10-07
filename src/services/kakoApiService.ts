import type { Coordinates, KakaoSearchResult } from "../types/index";
import { loadKakaoSdk } from "./kakaoSdkLoader";

/**
 * 카카오맵 JavaScript SDK의 키워드 검색으로 장소를 검색한다.
 *
 * 이전에는 REST API(dapi.kakao.com + KakaoAK 헤더)를 직접 호출했으나,
 * REST 키는 도메인 제한이 불가능해 정적 배포 시 번들에 노출되면 그대로 도용된다.
 * JS SDK는 도메인 제한이 걸린 JavaScript 키를 사용하므로 노출되어도 안전하다.
 *
 * @param query - 검색어 (장소명 또는 주소)
 * @returns 검색 결과 배열
 */
export const searchKakaoLocation = async (query: string): Promise<KakaoSearchResult[]> => {
    if (!query) {
        return [];
    }

    try {
        const kakao = await loadKakaoSdk();

        return await new Promise<KakaoSearchResult[]>((resolve, reject) => {
            const places = new kakao.maps.services.Places();

            places.keywordSearch(query, (result, status) => {
                if (status === kakao.maps.services.Status.ZERO_RESULT) {
                    resolve([]);
                    return;
                }

                if (status !== kakao.maps.services.Status.OK) {
                    console.error("Kakao Places keywordSearch failed. status:", status);
                    reject(new Error(
                        "장소 검색에 실패했습니다. 검색어를 바꾸거나 잠시 후 다시 시도해주세요."
                    ));
                    return;
                }

                resolve(
                    result.map((item) => ({
                        name: item.place_name,
                        address: item.address_name,
                        roadAddress: item.road_address_name,
                        coords: {
                            latitude: parseFloat(item.y),
                            longitude: parseFloat(item.x),
                        },
                    }))
                );
            });
        });
    } catch (error) {
        console.error("Error calling Kakao Places keyword search:", error);
        if (error instanceof Error) {
            throw new Error(`장소 검색 중 오류가 발생했습니다: ${error.message}`);
        }
        throw new Error("장소 검색 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
};

const addressCache = new Map<string, Promise<string | null>>();

/**
 * 좌표를 주소로 바꾼다 (도로명 우선, 없으면 지번). 주소가 없는 정류소(서울 따릉이)용.
 * 같은 좌표는 한 번만 호출하고, 실패(null)는 캐시하지 않아 다음에 다시 시도한다.
 */
export const reverseGeocode = (coords: Coordinates): Promise<string | null> => {
    const key = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
    const cached = addressCache.get(key);
    if (cached) return cached;

    const request = loadKakaoSdk()
        .then(
            (kakao) =>
                new Promise<string | null>((resolve) => {
                    new kakao.maps.services.Geocoder().coord2Address(coords.longitude, coords.latitude, (result, status) => {
                        if (status !== kakao.maps.services.Status.OK || !result[0]) {
                            resolve(null);
                            return;
                        }
                        resolve(result[0].road_address?.address_name || result[0].address?.address_name || null);
                    });
                })
        )
        .catch((error) => {
            console.error('Kakao coord2Address failed:', error);
            return null;
        })
        .then((address) => {
            if (address === null) addressCache.delete(key);
            return address;
        });
    addressCache.set(key, request);
    return request;
};
