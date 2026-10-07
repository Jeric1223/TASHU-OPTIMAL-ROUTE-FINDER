import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CityId } from '../types/index';
import { CITY_LIST } from '../services/cityService';
import UiIcon from './UiIcon';

interface CitySheetProps {
    open: boolean;
    current: CityId;
    /** 내 위치에서 가장 가까운 도시. 위치를 모르면 null */
    nearest: CityId | null;
    /** 현재 도시 데이터의 갱신 경과(분). 현재 도시만 알 수 있다 */
    ageMin: number | null;
    onSelect: (id: CityId) => void;
    onClose: () => void;
    /** 닫힐 때 포커스를 돌려줄 칩 */
    returnFocusTo: React.RefObject<HTMLElement | null>;
    /** 데스크톱 팝오버가 칩 아래에 붙도록 하는 top 값(px) */
    popoverTop?: number;
}

// 모바일은 바텀시트, 900px 이상은 칩 아래 팝오버. 열려 있는 동안 뒷화면(#root)은 inert.
const CitySheet: React.FC<CitySheetProps> = ({ open, current, nearest, ageMin, onSelect, onClose, returnFocusTo, popoverTop = 76 }) => {
    const sheetRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const root = document.getElementById('root');
        root?.setAttribute('inert', '');
        const t = setTimeout(() => sheetRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true }), 60);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const returnTo = returnFocusTo.current;
        return () => {
            clearTimeout(t);
            document.removeEventListener('keydown', onKey);
            root?.removeAttribute('inert');
            returnTo?.focus({ preventScroll: true });
        };
    }, [open, onClose, returnFocusTo]);

    if (!open) return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[100] bg-gray-900/30 min-[900px]:bg-gray-900/10 animate-fade-in" onClick={onClose} />
            <section
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="city-sheet-title"
                style={{ '--pop-top': `${popoverTop}px` } as React.CSSProperties}
                className="fixed z-[101] inset-x-0 bottom-0 px-4 pt-2.5 pb-6 rounded-t-[28px] bg-surface shadow-[0_-8px_32px_rgba(20,23,28,0.16)] animate-slide-up min-[900px]:inset-x-auto min-[900px]:left-4 min-[900px]:bottom-auto min-[900px]:top-[var(--pop-top)] min-[900px]:w-[380px] min-[900px]:p-4 min-[900px]:rounded-3xl"
            >
                <span className="block w-9 h-1 mx-auto mb-3.5 rounded-full bg-gray-300 min-[900px]:hidden" />
                <h2 id="city-sheet-title" className="font-headline font-bold text-xl leading-[1.45] text-on-surface">어느 도시 자전거를 볼까요?</h2>
                <div role="group" aria-label="도시" className="mt-3.5 grid gap-2">
                    {CITY_LIST.map((c) => {
                        const selected = c.id === current;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => onSelect(c.id)}
                                className={`press grid grid-cols-[1fr_auto] items-center gap-3 min-h-[72px] px-4 py-3 rounded-[18px] bg-white text-left ${selected ? 'shadow-[inset_0_0_0_2px_#14171c]' : 'shadow-[inset_0_0_0_1px_#E4E6E3]'}`}
                            >
                                <span>
                                    <b className="block text-base font-semibold text-on-surface">{c.name} · {c.serviceName}</b>
                                    <span className="block text-[13px] text-on-surface-variant">
                                        {c.id === nearest ? '내 위치에서 가장 가까워요' : '다른 도시 보기'}
                                    </span>
                                    {selected && ageMin !== null && (
                                        <span className="block text-[13px] text-on-surface-variant tabular-nums">{ageMin}분 전 기준</span>
                                    )}
                                </span>
                                <span className={`grid place-items-center w-6 h-6 rounded-full ${selected ? 'bg-on-surface text-white' : 'shadow-[inset_0_0_0_2px_#c9ccc9]'}`}>
                                    {selected && <UiIcon name="check" className="w-5 h-5" />}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="mt-3.5 text-[13px] text-on-surface-variant" style={{ textWrap: 'pretty' }}>
                    화면 구성은 그대로이고, 정류소 데이터만 도시에 맞게 바뀝니다.
                </p>
            </section>
        </>,
        document.body
    );
};

export default CitySheet;
