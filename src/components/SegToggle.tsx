import React from 'react';

interface SegToggleProps {
    value: 'all' | 'avail';
    onChange: (value: 'all' | 'avail') => void;
    className?: string;
}

// 흰 알약이 스프링으로 미끄러지는 2단 토글
const SegToggle: React.FC<SegToggleProps> = ({ value, onChange, className = '' }) => (
    <div role="group" aria-label="정류소 필터" className={`relative grid grid-cols-2 p-1 rounded-[22px] bg-gray-100 ${className}`}>
        <i
            aria-hidden
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[18px] bg-white shadow-[0_1px_3px_rgba(20,23,28,0.18)]"
            style={{ transform: value === 'avail' ? 'translateX(100%)' : 'none', transition: 'transform 0.35s var(--spring)' }}
        />
        {([['all', '전체'], ['avail', '대여 가능']] as const).map(([v, label]) => (
            <button
                key={v}
                type="button"
                aria-pressed={value === v}
                onClick={() => onChange(v)}
                className={`relative min-h-[40px] rounded-[18px] text-sm font-semibold transition-colors ${value === v ? 'text-on-surface' : 'text-on-surface-variant'}`}
            >
                {label}
            </button>
        ))}
    </div>
);

export default SegToggle;
