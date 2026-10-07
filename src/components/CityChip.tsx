import React from 'react';
import type { CityConfig } from '../types/index';
import UiIcon from './UiIcon';

interface CityChipProps {
    city: CityConfig;
    expanded: boolean;
    onClick: () => void;
    /** 'pill': 단독 알약(경로 화면), 'combo': 검색 알약 왼쪽에 붙는 칸 */
    variant?: 'pill' | 'combo';
}

// 도시 선택 시트를 여는 칩. 시트가 닫힐 때 포커스가 돌아올 수 있게 ref를 받는다.
const CityChip = React.forwardRef<HTMLButtonElement, CityChipProps>(({ city, expanded, onClick, variant = 'combo' }, ref) => (
    <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        className={variant === 'pill'
            ? 'press nav-pill min-h-[44px] pl-4 pr-3 rounded-[22px] flex items-center gap-0.5 text-[15px] font-bold text-on-surface'
            : 'press flex-none min-h-[52px] pl-[18px] pr-2.5 rounded-l-[26px] flex items-center gap-0.5 text-[15px] font-bold text-on-surface'}
    >
        <span className="sr-only">도시 변경, </span>
        {city.name}
        <UiIcon name="down" className={`w-[18px] h-[18px] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
    </button>
));
CityChip.displayName = 'CityChip';

export default CityChip;
