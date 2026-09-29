import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { StationWithDistance } from '../types/index';
import FavoriteButton from './FavoriteButton';
import { useCountUp } from '../hooks/useCountUp';
import UiIcon from './UiIcon';
import { calculateWalkTime } from '../services/routeService';

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);
export const walkMinutes = (km: number) => Math.max(1, calculateWalkTime(km));

interface StationDeckProps {
    stations: StationWithDistance[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onMakeRoute: (station: StationWithDistance) => void;
    onShowAll: () => void;
    emptyMessage: { title: string; sub: string; canShowAll: boolean };
}

const Count: React.FC<{ n: number }> = ({ n }) => <span className="tabular-nums">{useCountUp(n)}</span>;

// 가운데 카드가 선택이다. 좌우로 넘기면 선택이 바뀌고, 핀/화살표/방향키는 카드를 가운데로 스크롤한다.
const StationDeck: React.FC<StationDeckProps> = ({ stations, selectedIndex, onSelect, onMakeRoute, onShowAll, emptyMessage }) => {
    const deckRef = useRef<HTMLElement | null>(null);
    const lockUntil = useRef(0);
    const raf = useRef(0);
    const lastReported = useRef(-1);

    const scrollToCard = useCallback((i: number, smooth: boolean) => {
        const deck = deckRef.current;
        const card = deck?.children[i] as HTMLElement | undefined;
        if (!deck || !card) return;
        lockUntil.current = performance.now() + 700;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        deck.scrollTo({ left: card.offsetLeft - (deck.clientWidth - card.offsetWidth) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    }, []);

    // 바깥(지도 핀 등)에서 선택이 바뀌면 카드를 가운데로 가져온다
    useEffect(() => {
        if (selectedIndex !== lastReported.current) scrollToCard(selectedIndex, true);
    }, [selectedIndex, stations, scrollToCard]);

    // 가운데에서 멀어질수록 작고 흐리게. 스크롤 위치에서 바로 계산하므로 슬라이드하는 동안 지금 가운데인 카드가 그대로 커 보인다.
    const applyScale = useCallback(() => {
        const deck = deckRef.current;
        if (!deck || !deck.children.length) return -1;
        const mid = deck.scrollLeft + deck.clientWidth / 2;
        let best = 0, bestD = Infinity;
        Array.from(deck.children).forEach((c, k) => {
            const el = c as HTMLElement;
            const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
            if (d < bestD) { bestD = d; best = k; }
            const t = Math.min(1, d / (el.offsetWidth + 12));
            el.style.setProperty('--s', String(1 - 0.08 * t));
            el.style.setProperty('--o', String(1 - 0.16 * t));
        });
        return best;
    }, []);

    useLayoutEffect(() => { applyScale(); }, [stations, applyScale]);

    // 스크롤이 멈췄는데 카드가 가운데에서 벗어나 있으면(모바일에서 스냅이 덜 붙는 경우) 가장 가까운 카드를 가운데로 붙인다
    const settleTimer = useRef(0);
    const touching = useRef(false);
    const settle = () => {
        window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => {
            const deck = deckRef.current;
            if (!deck || touching.current || drag.current.active || performance.now() < lockUntil.current) return;
            const best = applyScale();
            const card = deck.children[best] as HTMLElement | undefined;
            if (best < 0 || !card) return;
            if (best !== lastReported.current) { lastReported.current = best; onSelect(best); }
            if (Math.abs(deck.scrollLeft - (card.offsetLeft - (deck.clientWidth - card.offsetWidth) / 2)) > 2) scrollToCard(best, true);
        }, 140);
    };
    useEffect(() => () => window.clearTimeout(settleTimer.current), []);

    const onScroll = () => {
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
            const best = applyScale();
            // 버튼·핀으로 스크롤하는 중에는 선택을 바꾸지 않는다
            if (best < 0 || performance.now() < lockUntil.current) return;
            if (best !== selectedIndex) { lastReported.current = best; onSelect(best); }
        });
        settle();
    };

    const go = (i: number) => {
        const next = Math.max(0, Math.min(stations.length - 1, i));
        lastReported.current = -1;
        onSelect(next);
        scrollToCard(next, true);
    };

    // 마우스는 가로 스크롤 수단이 없으므로 드래그로 넘긴다. 터치는 브라우저 기본 스크롤을 쓴다.
    const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });
    const [dragging, setDragging] = useState(false);

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || !deckRef.current) return;
        drag.current = { active: true, moved: false, startX: e.clientX, startLeft: deckRef.current.scrollLeft };
    };
    const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
        const d = drag.current;
        const deck = deckRef.current;
        if (!d.active || !deck) return;
        const dx = e.clientX - d.startX;
        if (!d.moved && Math.abs(dx) < 6) return;
        if (!d.moved) { d.moved = true; setDragging(true); deck.setPointerCapture(e.pointerId); }
        deck.scrollLeft = d.startLeft - dx;
    };
    const endDrag = () => {
        const d = drag.current;
        if (!d.active) return;
        d.active = false;
        if (!d.moved) return;
        setDragging(false);
        // click이 오지 않는 경우(취소 등)에도 다음 클릭이 삼켜지지 않게 한다
        setTimeout(() => { drag.current.moved = false; }, 50);
        // 놓은 자리에서 가장 가까운 카드를 선택하고 가운데로 붙인다
        const deck = deckRef.current;
        if (!deck) return;
        const mid = deck.scrollLeft + deck.clientWidth / 2;
        let best = 0, bestD = Infinity;
        Array.from(deck.children).forEach((c, k) => {
            const el = c as HTMLElement;
            const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
            if (dist < bestD) { bestD = dist; best = k; }
        });
        go(best);
    };
    // 드래그가 끝난 직후의 click은 카드 선택/버튼으로 새지 않게 막는다
    const onClickCapture = (e: React.MouseEvent) => {
        if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false; }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
            if (!stations.length) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); go(selectedIndex + 1); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); go(selectedIndex - 1); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <>
            <section
                ref={deckRef}
                onScroll={onScroll}
                onTouchStart={() => { touching.current = true; }}
                onTouchEnd={() => { touching.current = false; settle(); }}
                onTouchCancel={() => { touching.current = false; settle(); }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={onClickCapture}
                role="region"
                tabIndex={0}
                aria-label="정류소 카드. 좌우 방향키로 넘겨 보세요"
                className={`station-deck fixed inset-x-0 z-[var(--z-sheet)] flex gap-3 overflow-x-auto no-scrollbar ${dragging ? 'is-dragging' : ''}`}
            >
                {stations.length === 0 ? (
                    <div className="flex-none w-[300px] snap-center rounded-[24px] bg-white p-5 text-center shadow-[0_6px_24px_rgba(20,23,28,0.14),0_0_0_1px_rgba(20,23,28,0.05)]">
                        <p className="text-[15px] font-semibold text-on-surface">{emptyMessage.title}</p>
                        <p className="mt-1 mb-3.5 text-[13px] text-on-surface-variant">{emptyMessage.sub}</p>
                        {emptyMessage.canShowAll && (
                            <button onClick={onShowAll} className="press min-h-[44px] px-[18px] rounded-[14px] bg-gray-100 text-sm font-bold text-on-surface">전체 보기</button>
                        )}
                    </div>
                ) : stations.map((s, i) => {
                    const on = i === selectedIndex;
                    const km = s.distance ?? 0;
                    return (
                        <article
                            key={s.id}
                            aria-current={on ? 'true' : undefined}
                            onClick={(e) => { if (!on && !(e.target as HTMLElement).closest('button')) go(i); }}
                            className={`station-card flex-none w-[300px] snap-center snap-always p-4 rounded-[24px] bg-white origin-bottom will-change-transform shadow-[0_6px_24px_rgba(20,23,28,0.14),0_0_0_1px_rgba(20,23,28,0.05)] ${on ? '' : 'cursor-pointer'}`}
                            style={{
                                animationDelay: `${Math.min(i, 8) * 50 + 100}ms`,
                                animationFillMode: 'backwards',
                            }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="min-h-[44px] text-base font-semibold leading-[1.4] text-on-surface line-clamp-2" style={{ textWrap: 'balance' }}>{s.name}</h2>
                                <FavoriteButton station={s} />
                            </div>
                            <div className="mt-2.5 flex items-end justify-between">
                                <div className={`text-[40px] leading-none font-bold ${s.parking_count === 0 ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                                    <Count key={on ? 'on' : 'off'} n={s.parking_count} />
                                    <small className="ml-1 text-[15px] font-semibold text-on-surface-variant">대</small>
                                </div>
                                {s.distance !== undefined && (
                                    <p className="text-right text-[13px] leading-normal text-on-surface-variant">
                                        <b className="block text-[15px] font-semibold text-on-surface">{formatDistance(km)}</b>
                                        도보 약 {walkMinutes(km)}분
                                    </p>
                                )}
                            </div>
                            <div className="grid transition-[grid-template-rows] duration-[400ms]" style={{ gridTemplateRows: on ? '1fr' : '0fr', transitionTimingFunction: 'var(--spring)' }}>
                                <p className="min-h-0 overflow-hidden text-xs text-on-surface-variant" style={{ paddingTop: on ? 8 : 0 }}>{s.address}</p>
                            </div>
                            <button
                                onClick={() => onMakeRoute(s)}
                                className={`press mt-3.5 w-full min-h-[48px] rounded-[14px] text-[15px] font-bold transition-colors ${on ? 'bg-primary text-white' : 'bg-gray-100 text-on-surface'}`}
                            >
                                {s.parking_count === 0 ? '여기로 반납하는 경로 만들기' : '여기서 빌리는 경로 만들기'}
                            </button>
                        </article>
                    );
                })}
            </section>
            {stations.length > 0 && (['prev', 'next'] as const).map(dir => {
                const disabled = dir === 'prev' ? selectedIndex <= 0 : selectedIndex >= stations.length - 1;
                return (
                    <button
                        key={dir}
                        onClick={() => go(selectedIndex + (dir === 'prev' ? -1 : 1))}
                        disabled={disabled}
                        aria-label={dir === 'prev' ? '이전 정류소' : '다음 정류소'}
                        className={`station-arrow press hidden min-[900px]:grid fixed bottom-[108px] z-[var(--z-overlay)] w-12 h-12 place-items-center rounded-full bg-white shadow-[0_6px_24px_rgba(20,23,28,0.14),0_0_0_1px_rgba(20,23,28,0.05)] disabled:opacity-35 disabled:pointer-events-none ${dir === 'prev' ? 'left-6' : 'right-6'}`}
                    >
                        <UiIcon name={dir} />
                    </button>
                );
            })}
        </>
    );
};

export default StationDeck;
