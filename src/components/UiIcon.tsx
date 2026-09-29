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
    refresh: <><path d="M19 12a7 7 0 1 1-2.1-5" /><path d="M19 4.5V8h-3.5" /></>,
    locate: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.6" fill="currentColor" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" /></>,
    navigate: <path d="M20 4 4 10.5l6.5 2.5 2.5 6.5z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    star: <path d="m12 4.5 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" />,
    alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5" /><circle cx="12" cy="16" r=".6" fill="currentColor" /></>,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></>,
    help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1.1.9-1.1 1.6" /><circle cx="12" cy="16.6" r=".6" fill="currentColor" /></>,
    feedback: <path d="M5 5h14v10h-8.5L6 19v-4H5z" />,
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
