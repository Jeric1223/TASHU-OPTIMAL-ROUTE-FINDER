import React from 'react';

// 시안 D의 선형 아이콘 (24×24, 선 두께 1.8). 색은 currentColor를 따른다.
const PATHS = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    compass: <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
    route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.8" /></>,
    heart: <path d="M12 19.5s-7-4.2-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 1.9c0 5.4-7 9.6-7 9.6z" />,
    prev: <path d="m14.5 6-6 6 6 6" />,
    next: <path d="m9.5 6 6 6-6 6" />,
    more: <><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>,
    swap: <path d="M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3" />,
    edit: <><path d="m5 19 1-4 9-9 3 3-9 9z" /><path d="m14 7 3 3" /></>,
    trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
} as const;

export type UiIconName = keyof typeof PATHS;

interface UiIconProps {
    name: UiIconName;
    className?: string;
    /** 활성 탭처럼 안을 채워야 할 때 */
    filled?: boolean;
}

const UiIcon: React.FC<UiIconProps> = ({ name, className = 'w-6 h-6', filled }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {PATHS[name]}
    </svg>
);

export default UiIcon;
