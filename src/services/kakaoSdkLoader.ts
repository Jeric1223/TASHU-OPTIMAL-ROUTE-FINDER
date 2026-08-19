/**
 * 카카오맵 JavaScript SDK 로더.
 *
 * REST API 키(KakaoAK 헤더) 대신 JavaScript 키를 사용한다.
 * JS 키는 카카오 개발자 콘솔의 [플랫폼 > Web > 사이트 도메인]에 등록된
 * 도메인에서만 동작하므로, 번들에 노출되어도 타 도메인에서 재사용할 수 없다.
 *
 * SDK는 앱 전체에서 한 번만 로드하며, 동시에 여러 번 호출되어도
 * 동일한 Promise를 공유한다.
 */

let sdkPromise: Promise<typeof window.kakao> | null = null;

const SDK_SRC = (jsKey: string) =>
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&libraries=services&autoload=false`;

export const loadKakaoSdk = (): Promise<typeof window.kakao> => {
    if (sdkPromise) {
        return sdkPromise;
    }

    sdkPromise = new Promise((resolve, reject) => {
        // 이미 로드된 경우(HMR 등) 재사용
        if (window.kakao?.maps?.services) {
            resolve(window.kakao);
            return;
        }

        // @ts-ignore - Vite 환경변수
        const jsKey = import.meta.env?.VITE_KAKAO_JS_KEY as string;
        if (!jsKey) {
            reject(new Error('카카오 JavaScript 키가 설정되지 않았습니다. (VITE_KAKAO_JS_KEY)'));
            return;
        }

        const script = document.createElement('script');
        script.src = SDK_SRC(jsKey);
        script.async = true;

        script.onload = () => {
            // autoload=false 이므로 명시적으로 로드해야 services 사용 가능
            window.kakao.maps.load(() => resolve(window.kakao));
        };
        script.onerror = () => {
            sdkPromise = null; // 실패 시 다음 호출에서 재시도 허용
            reject(new Error('카카오맵 SDK를 불러오지 못했습니다. 네트워크 상태를 확인해주세요.'));
        };

        document.head.appendChild(script);
    });

    return sdkPromise;
};
