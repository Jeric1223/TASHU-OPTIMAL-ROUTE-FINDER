import React, { useState, useEffect } from 'react';
import type { Station } from '../types/index';
import { StarIcon, StarFilledIcon } from './icons';
import { addFavorite, removeFavorite, isFavorite } from '../services/favoriteService';

interface FavoriteButtonProps {
    station: Station;
    onToggle?: (isFavorited: boolean) => void;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ station, onToggle }) => {
    const [isFav, setIsFav] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsFav(isFavorite(station.id));
    }, [station.id]);

    const handleToggle = async () => {
        setIsLoading(true);
        try {
            if (isFav) {
                removeFavorite(station.id);
                setIsFav(false);
                onToggle?.(false);
            } else {
                const success = addFavorite(station);
                if (success) {
                    setIsFav(true);
                    onToggle?.(true);
                }
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className="neomorph-btn p-2 rounded-full transition-transform hover:scale-110 disabled:opacity-50"
            aria-label={isFav ? '즐겨찾기 제거' : '즐겨찾기 추가'}
            title={isFav ? '즐겨찾기 제거' : '즐겨찾기 추가'}
        >
            {isFav ? (
                <StarFilledIcon className="w-5 h-5 text-yellow-400" />
            ) : (
                <StarIcon className="w-5 h-5 text-gray-400" />
            )}
        </button>
    );
};

export default FavoriteButton;
