import React, { useCallback, useEffect, useRef } from 'react';

export type SheetSnap = 'peek' | 'half' | 'full';

interface SheetProps {
    snap: SheetSnap;
    onSnapChange: (snap: SheetSnap) => void;
    peekContent: React.ReactNode;
    children: React.ReactNode;
}

const PEEK_PX = 88;
const DRAG_THRESHOLD_PX = 6;

// 상단 안전영역(상태바) px. env()는 JS에서 바로 읽을 수 없어 probe 요소로 잰다.
const safeAreaTopPx = (): number => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;height:var(--safe-area-inset-top);visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const px = probe.offsetHeight;
    probe.remove();
    return px;
};

// 스냅 상태 → 시트 높이(px). half/full은 뷰포트 크기에 따라 달라지므로 런타임 계산.
// full은 탭바(--nav-h, 하단 안전영역 포함) 실측 높이와 상태바를 모두 빼야
// 홈 화면 앱에서 시트가 상태바를 덮지 않는다. (고정 72px은 안전영역을 몰라 34px만큼 더 올라갔다)
const snapHeightPx = (snap: SheetSnap): number => {
    const vh = window.innerHeight;
    if (snap === 'peek') return PEEK_PX;
    if (snap === 'half') return Math.round(vh * 0.44);
    const navH = document.querySelector<HTMLElement>('nav.bottom-nav')?.offsetHeight ?? 72;
    return Math.max(vh - navH - safeAreaTopPx() - 64, PEEK_PX);
};

const Sheet: React.FC<SheetProps> = ({ snap, onSnapChange, peekContent, children }) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{ startY: number; startHeight: number; maxHeight: number; moved: boolean } | null>(null);

    const applyHeight = useCallback((px: number) => {
        document.documentElement.style.setProperty('--sheet-h', `${px}px`);
    }, []);

    useEffect(() => {
        applyHeight(snapHeightPx(snap));
    }, [snap, applyHeight]);

    useEffect(() => {
        const handleResize = () => applyHeight(snapHeightPx(snap));
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [snap, applyHeight]);

    const nearestSnap = (px: number): SheetSnap => {
        const candidates: [SheetSnap, number][] = [
            ['peek', snapHeightPx('peek')],
            ['half', snapHeightPx('half')],
            ['full', snapHeightPx('full')],
        ];
        let best: SheetSnap = 'peek';
        let bestDist = Infinity;
        for (const [name, h] of candidates) {
            const dist = Math.abs(px - h);
            if (dist < bestDist) { bestDist = dist; best = name; }
        }
        return best;
    };

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        dragState.current = {
            startY: e.clientY,
            startHeight: snapHeightPx(snap),
            // 드래그 중 매 move마다 DOM을 재지 않도록 시작 시점에 한 번만 계산
            maxHeight: snapHeightPx('full'),
            moved: false,
        };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragState.current) return;
        const dy = dragState.current.startY - e.clientY;
        if (Math.abs(dy) > DRAG_THRESHOLD_PX) dragState.current.moved = true;
        const nextHeight = Math.min(
            Math.max(dragState.current.startHeight + dy, PEEK_PX),
            dragState.current.maxHeight
        );
        applyHeight(nextHeight);
    };

    const onPointerUp = () => {
        if (!dragState.current) return;
        const el = sheetRef.current;
        const currentPx = el ? el.getBoundingClientRect().height : snapHeightPx(snap);
        const moved = dragState.current.moved;
        dragState.current = null;
        if (moved) {
            const next = nearestSnap(currentPx);
            applyHeight(snapHeightPx(next));
            onSnapChange(next);
        } else {
            applyHeight(snapHeightPx(snap));
        }
    };

    const onHandleClick = () => {
        if (dragState.current?.moved) return;
        const order: SheetSnap[] = ['peek', 'half', 'full'];
        const next = order[(order.indexOf(snap) + 1) % order.length];
        onSnapChange(next);
    };

    return (
        <div
            ref={sheetRef}
            className="fixed left-0 right-0 bottom-[var(--nav-h)] z-[var(--z-sheet)] bg-white rounded-t-xl shadow-sheet border-t border-gray-200 flex flex-col overflow-hidden touch-none"
            style={{ height: 'var(--sheet-h)', transition: dragState.current ? 'none' : 'height .28s cubic-bezier(.32,.72,0,1)' }}
        >
            <button
                type="button"
                aria-label="시트 높이 전환"
                className="w-full flex flex-col items-center pt-2 pb-1 shrink-0 touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClick={onHandleClick}
            >
                <span className="w-9 h-1 rounded-full bg-gray-300" />
            </button>

            <div className="px-5 pb-2 shrink-0">{peekContent}</div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">
                {children}
            </div>
        </div>
    );
};

export default Sheet;
