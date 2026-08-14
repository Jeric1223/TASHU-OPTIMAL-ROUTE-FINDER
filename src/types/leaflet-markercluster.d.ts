import 'leaflet';

// leaflet.markercluster는 런타임에 L 네임스페이스를 확장하지만 자체 타입 선언을 제공하지 않는다.
// TashuMap에서 실제로 쓰는 API만 최소한으로 선언한다.
declare module 'leaflet' {
    interface MarkerClusterGroupOptions extends LayerOptions {
        iconCreateFunction?: (cluster: { getChildCount(): number }) => DivIcon;
        maxClusterRadius?: number;
    }

    function markerClusterGroup(options?: MarkerClusterGroupOptions): LayerGroup;
}
