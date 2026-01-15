import React from 'react';
import { BicycleIcon, CompassIcon, StarIcon } from './icons';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'NEARBY', icon: BicycleIcon, label: '주변' },
        { id: 'DESTINATION', icon: CompassIcon, label: '목적지' },
        { id: 'ROUTE', icon: CompassIcon, label: '경로' },
        { id: 'FAVORITES', icon: StarIcon, label: '즐겨찾기' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 neomorph-card rounded-t-3xl border-t border-neumorphic-dark border-opacity-20 pb-safe pt-2">
            <div className="flex justify-around">
                {tabs.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={`flex flex-col items-center gap-1 p-3 flex-1 transition-colors ${
                            activeTab === id
                                ? 'text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        aria-label={label}
                        title={label}
                    >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default MobileTabBar;
