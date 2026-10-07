import { useEffect, useState } from 'react';
import type { Station } from '../types';
import { reverseGeocode } from '../services/kakoApiService';
import { stationSubLabel } from '../services/cityService';

/**
 * 정류소 보조 문구. 주소가 없는 정류소는 카카오 좌표→주소 변환 결과로 채운다.
 * enabled가 false면 호출하지 않는다 (카드가 많은 덱에서 선택 카드 주변만 변환하기 위함).
 * 변환 전·실패 시에는 stationSubLabel(정류소 번호)을 그대로 보여준다.
 */
export const useStationAddress = (station: Station, enabled = true): string => {
    const [address, setAddress] = useState<string | null>(null);
    const needs = enabled && !station.address;

    useEffect(() => {
        if (!needs) return;
        let alive = true;
        reverseGeocode({ latitude: station.x_pos, longitude: station.y_pos }).then((a) => {
            if (alive) setAddress(a);
        });
        return () => { alive = false; };
    }, [needs, station.x_pos, station.y_pos]);

    return station.address || address || stationSubLabel(station);
};
