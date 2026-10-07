// 서울 따릉이 정류소 수집 — GitHub Actions에서 실행한다 (`SEOUL_API_KEY` 시크릿 필요).
// 서울 열린데이터광장 API는 HTTP만 지원해 브라우저에서 직접 호출할 수 없으므로 정적 JSON으로 만든다.
// 실패하면 기존 public/data/seoul-stations.json을 그대로 둔다 (타슈 수집 스텝과 동일한 정책).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT_PATH = 'public/data/seoul-stations.json';
const PAGE_SIZE = 1000; // API 1회 최대 건수
const MAX_PAGES = 20; // 무한 루프 방지

// "102. 망원역 1번출구 앞" → { no: "102", name: "망원역 1번출구 앞" }
export function splitStationName(raw) {
    const m = /^\s*(\d+)\s*\.\s*(.+?)\s*$/.exec(String(raw ?? ''));
    return m ? { no: m[1], name: m[2] } : { no: undefined, name: String(raw ?? '').trim() };
}

// 따릉이 row 하나를 Station 형태로 변환한다. 좌표가 숫자가 아니면 null.
/** @returns {import('../src/types/index').Station | null} */
export function mapSeoulRow(row) {
    const lat = Number(row.stationLatitude);
    const lon = Number(row.stationLongitude);
    // 빈 문자열은 Number()로 0이 되므로 0도 무효 좌표로 본다
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0 || lon === 0) return null;
    const { no, name } = splitStationName(row.stationName);
    const parking = Number(row.parkingBikeTotCnt);
    const rack = Number(row.rackTotCnt);
    /** @type {import('../src/types/index').Station} */
    const station = {
        id: String(row.stationId),
        name,
        x_pos: lat, // 타슈 API 네이밍을 따른다: x_pos = 위도, y_pos = 경도
        y_pos: lon,
        address: '', // 응답에 주소가 없다
        parking_count: Number.isFinite(parking) ? parking : 0,
    };
    if (Number.isFinite(rack) && rack > 0) station.rack_count = rack;
    if (no) station.station_no = no;
    return station;
}

// 응답에서 { total, rows }를 꺼낸다. 최상위 키(rentBikeStatus 등)는 row 배열을 가진 첫 객체로 찾는다.
export function parsePage(json) {
    const body = Object.values(json ?? {}).find((v) => v && typeof v === 'object' && 'row' in v);
    if (!body) {
        const code = json?.RESULT?.CODE ?? 'UNKNOWN';
        throw new Error(`응답에 row가 없습니다 (${code})`);
    }
    const total = Number(body.list_total_count);
    if (!Number.isFinite(total)) throw new Error('list_total_count가 없습니다');
    return { total, rows: body.row };
}

// list_total_count는 전체 정류소 수가 아니라 이번 요청 구간에 들어온 행 수라서 종료 판단에 못 쓴다.
// 한 페이지가 PAGE_SIZE보다 적게 오거나 데이터 없음(INFO-200)이 오면 끝으로 본다.
async function fetchAll(key) {
    const rows = [];
    for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE + 1;
        const url = `http://openapi.seoul.go.kr:8088/${key}/json/bikeList/${start}/${start + PAGE_SIZE - 1}/`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (page > 0 && json?.RESULT?.CODE === 'INFO-200') break;
        const { rows: pageRows } = parsePage(json);
        rows.push(...pageRows);
        if (pageRows.length < PAGE_SIZE) break;
    }
    if (rows.length === 0) throw new Error('수집된 정류소가 없습니다');
    return rows;
}

async function main() {
    const key = process.env.SEOUL_API_KEY;
    mkdirSync('public/data', { recursive: true });
    try {
        if (!key) throw new Error('SEOUL_API_KEY가 설정되지 않았습니다');
        const rows = await fetchAll(key);
        const stations = rows.map(mapSeoulRow).filter(Boolean);
        const out = { city: 'seoul', updatedAt: new Date().toISOString(), stations };
        writeFileSync(OUT_PATH, JSON.stringify(out));
        console.log(`Saved ${stations.length} stations (원본 ${rows.length}건)`);
    } catch (e) {
        // 키 노출 방지를 위해 URL은 출력하지 않고 메시지만 남긴다
        console.log(`::warning::서울 정류소 수집 실패, 기존 데이터 유지: ${e.message}`);
        if (!existsSync(OUT_PATH)) {
            writeFileSync(OUT_PATH, JSON.stringify({ city: 'seoul', updatedAt: null, stations: [] }));
        }
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
