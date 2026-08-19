/**
 * 카카오맵 JavaScript SDK 전역 타입 선언.
 * 실제로 사용하는 API(Places 키워드 검색, Geocoder 좌표 변환)만 선언한다.
 */

declare global {
    namespace kakao.maps {
        function load(callback: () => void): void;

        namespace services {
            /** 검색 결과 상태 코드 */
            const Status: {
                readonly OK: 'OK';
                readonly ZERO_RESULT: 'ZERO_RESULT';
                readonly ERROR: 'ERROR';
            };

            /** 좌표계 종류 */
            const Coords: {
                readonly WGS84: 'WGS84';
                readonly WCONGNAMUL: 'WCONGNAMUL';
                readonly CONGNAMUL: 'CONGNAMUL';
                readonly WTM: 'WTM';
                readonly TM: 'TM';
            };

            type SearchStatus = (typeof Status)[keyof typeof Status];

            /** 키워드 검색 결과 항목 (REST API의 documents 항목과 필드명 동일) */
            interface PlacesSearchResultItem {
                place_name: string;
                address_name: string;
                road_address_name: string;
                x: string; // 경도(longitude)
                y: string; // 위도(latitude)
            }

            class Places {
                constructor(map?: unknown);
                keywordSearch(
                    keyword: string,
                    callback: (
                        result: PlacesSearchResultItem[],
                        status: SearchStatus
                    ) => void,
                    options?: Record<string, unknown>
                ): void;
            }

            interface TransCoordResultItem {
                x: number;
                y: number;
            }

            class Geocoder {
                constructor();
                transCoord(
                    x: number,
                    y: number,
                    callback: (
                        result: TransCoordResultItem[],
                        status: SearchStatus
                    ) => void,
                    options?: {
                        input_coord?: string;
                        output_coord?: string;
                    }
                ): void;
            }
        }
    }

    interface Window {
        kakao: typeof kakao;
    }
}

export {};
