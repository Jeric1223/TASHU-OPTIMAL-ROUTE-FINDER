
import React from 'react';
import type { StationWithDistance } from '../types';
import StationCard from './StationCard';
import { LoadingSpinner, PinIcon } from './icons';

interface NearbySearchProps {
  onSearch: () => Promise<void>;
  result: StationWithDistance | null;
  loading: boolean;
  error: string | null;
}

const NearbySearch: React.FC<NearbySearchProps> = ({ onSearch, result, loading, error }) => {
  return (
    <div className="space-y-6 pt-4 text-center">
      <button
        onClick={onSearch}
        className="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-base sm:py-4 sm:px-6 sm:text-lg rounded-lg flex items-center justify-center gap-3 transition-transform transform hover:scale-105 disabled:bg-blue-300 disabled:cursor-not-allowed disabled:transform-none"
        disabled={loading}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <PinIcon />
            <span>
                <span className="hidden sm:inline">내 주변에서 사용 가능한 </span>
                <span className="sm:hidden">내 주변 </span>
                <span>타슈 찾기</span>
            </span>
          </>
        )}
      </button>

      {error && <p className="text-red-600 bg-red-100 border border-red-200 p-3 rounded-lg font-medium">{error}</p>}

      {result && !loading && (
         <div className="animate-fade-in pt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">가장 가까운 대여 가능 장소:</h2>
            <StationCard station={result} />
        </div>
      )}
    </div>
  );
};

export default NearbySearch;