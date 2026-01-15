
import type { Coordinates } from '../types';

export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 정보가 지원되지 않습니다."));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          reject(new Error("위치 정보 접근 권한이 거부되었습니다."));
        }
      );
    }
  });
};
