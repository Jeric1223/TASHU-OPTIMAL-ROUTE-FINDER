import type { FavoriteStation, Station } from '../types/index';

const STORAGE_KEY = 'tashu_favorites';

/**
 * Get all favorite stations from localStorage
 */
export const getFavorites = (): FavoriteStation[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading favorites from localStorage:', error);
        return [];
    }
};

/**
 * Add a station to favorites
 */
export const addFavorite = (station: Station, nickname?: string): boolean => {
    try {
        const favorites = getFavorites();

        // Check if station is already favorited
        if (favorites.some((fav) => fav.id === station.id)) {
            return false;
        }

        const favorite: FavoriteStation = {
            ...station,
            savedAt: new Date().toISOString(),
            nickname: nickname || undefined,
        };

        favorites.push(favorite);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        return true;
    } catch (error) {
        console.error('Error adding favorite:', error);
        return false;
    }
};

/**
 * Remove a station from favorites
 */
export const removeFavorite = (stationId: string): boolean => {
    try {
        const favorites = getFavorites();
        const filtered = favorites.filter((fav) => fav.id !== stationId);

        if (filtered.length === favorites.length) {
            return false; // Station was not found
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error removing favorite:', error);
        return false;
    }
};

/**
 * Check if a station is in favorites
 */
export const isFavorite = (stationId: string): boolean => {
    try {
        const favorites = getFavorites();
        return favorites.some((fav) => fav.id === stationId);
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
};

/**
 * Update nickname for a favorite station
 */
export const updateFavoriteNickname = (stationId: string, nickname: string): boolean => {
    try {
        const favorites = getFavorites();
        const favorite = favorites.find((fav) => fav.id === stationId);

        if (!favorite) {
            return false;
        }

        favorite.nickname = nickname || undefined;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        return true;
    } catch (error) {
        console.error('Error updating favorite nickname:', error);
        return false;
    }
};

/**
 * Clear all favorites
 */
export const clearAllFavorites = (): boolean => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing favorites:', error);
        return false;
    }
};
