// @ts-nocheck
import React, { useState } from 'react';
import type { StationWithDistance, LocationSearchResult } from '../types';
import StationCard from './StationCard';
import { LoadingSpinner, SearchIcon, MapPinIcon, XIcon } from './icons';

interface DestinationSearchProps {
  onSearch: (destination: string) => Promise<void>;
  onSelectResult: (result: LocationSearchResult) => void;
  onClear: () => void;
  searchResults: LocationSearchResult[] | null;
  result: StationWithDistance | null;
  loading: boolean;
  error: string | null;
}

const SearchResultList: React.FC<{ 
    results: LocationSearchResult[]; 
    onSelect: (result: LocationSearchResult) => void 
}> = ({ results, onSelect }) => (
    <div className="border-t border-gray-200 mt-4 pt-4 animate-fade-in">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">검색 결과:</h2>
        <ul className="space-y-2 max-h-60 overflow-y-auto" role="listbox">
            {results.map((item, index) => (
                <li key={index} role="option" aria-selected="false">
                    <button 
                        onClick={() => onSelect(item)}
                        className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPinIcon className="w-4 h-4 flex-shrink-0" /> 
                            <span>{item.roadAddress || item.address}</span>
                        </p>
                    </button>
                </li>
            ))}
        </ul>
    </div>
);

const DestinationSearch: React.FC<DestinationSearchProps> = ({ 
    onSearch, 
    onSelectResult,
    onClear,
    searchResults,
    result, 
    loading, 
    error 
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const showResultsList = searchResults && searchResults.length > 0;
  const showFinalResult = result && !loading && !showResultsList;

  return (
    <div className="space-y-4 pt-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 대전역, 카이스트 정문"
          className="flex-grow bg-white border border-gray-300 text-gray-900 placeholder-gray-400 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow disabled:bg-gray-100"
          disabled={loading || showResultsList || showFinalResult}
          aria-label="목적지 검색"
        />
        <div className="flex gap-2">
            <button
                type="submit"
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                disabled={loading || showResultsList || showFinalResult || !query}
            >
                {loading ? <LoadingSpinner /> : <SearchIcon />}
                <span className="sm:hidden">검색</span>
            </button>
            {(showResultsList || showFinalResult) && (
                 <button
                    type="button"
                    onClick={() => {
                        onClear();
                        setQuery('');
                    }}
                    className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    aria-label="다시 검색"
                >
                    <XIcon />
                    <span className="sm:hidden">초기화</span>
                </button>
            )}
        </div>
      </form>

      {error && <p className="text-red-600 bg-red-100 border border-red-200 p-3 rounded-lg text-center font-medium" role="alert">{error}</p>}
      
      {showResultsList && (
          <SearchResultList results={searchResults!} onSelect={onSelectResult} />
      )}

      {showFinalResult && (
        <div className="animate-fade-in pt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">가장 가까운 반납 장소:</h2>
            <StationCard station={result} />
        </div>
      )}
    </div>
  );
};

export default DestinationSearch;