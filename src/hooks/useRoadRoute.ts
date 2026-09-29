import { useEffect, useState } from 'react';
import type { OptimalRoute } from '../types/index';
import { fetchRoadPath, lonLatOf } from '../services/roadRouteService';
import { applyRoadDistances } from '../services/routeService';

// 직선 기준으로 계산된 경로에 도로 거리·시간을 덧입힌다.
// 응답이 오기 전에는 직선 기준 값을 그대로 쓰고, 실패한 구간도 직선 값을 유지한다.
// 지도는 원래 경로를 그대로 받아야(다시 그리지 않도록) 화면 표시용으로만 쓴다.
export const useRoadRoute = (route: OptimalRoute | null): OptimalRoute | null => {
    const [refined, setRefined] = useState<{ source: OptimalRoute; route: OptimalRoute } | null>(null);

    useEffect(() => {
        if (!route) return;
        const ctrl = new AbortController();
        Promise.all(
            route.segments.map((seg) => fetchRoadPath('foot', lonLatOf(seg.startPoint), lonLatOf(seg.endPoint), ctrl.signal))
        ).then((paths) => {
            if (ctrl.signal.aborted || paths.every((p) => !p)) return;
            setRefined({ source: route, route: applyRoadDistances(route, paths.map((p) => p?.distanceKm ?? null)) });
        });
        return () => ctrl.abort();
    }, [route]);

    return route && refined?.source === route ? refined.route : route;
};
