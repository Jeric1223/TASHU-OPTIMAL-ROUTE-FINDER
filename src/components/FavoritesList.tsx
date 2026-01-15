import React, { useState, useEffect } from 'react';
import type { FavoriteStation } from '../types/index';
import { getFavorites, removeFavorite } from '../services/favoriteService';
import StationCard from './StationCard';
import { TrashIcon, StarIcon } from './icons';

interface FavoritesListProps {
    onStationSelect?: (station: FavoriteStation) => void;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ onStationSelect }) => {
    const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = () => {
        setIsLoading(true);
        try {
            const favs = getFavorites();
            setFavorites(favs);
        } catch (error) {
            console.error('Error loading favorites:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = (stationId: string) => {
        if (removeFavorite(stationId)) {
            setFavorites(favorites.filter((fav) => fav.id !== stationId));
        }
    };

    if (isLoading) {
        return (
            <div className="neomorph-card p-8 text-center">
                <div className="text-gray-500">로드 중...</div>
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="neomorph-card p-8 text-center space-y-3">
                <StarIcon className="w-12 h-12 text-gray-300 mx-auto" />
                <div className="text-gray-500">즐겨찾기한 정류소가 없습니다.</div>
                <div className="text-sm text-gray-400">정류소를 선택해서 즐겨찾기에 추가하세요</div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">즐겨찾기 ({favorites.length})</h3>
            </div>

            {favorites.map((favorite) => (
                <div key={favorite.id} className="relative">
                    <StationCard station={favorite} />
                    <button
                        onClick={() => handleRemove(favorite.id)}
                        className="absolute top-4 right-4 neomorph-btn p-2 text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="즐겨찾기 제거"
                        title={`${favorite.name} 즐겨찾기 제거`}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default FavoritesList;
