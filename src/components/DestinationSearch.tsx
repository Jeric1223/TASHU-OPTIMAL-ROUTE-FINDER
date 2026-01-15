
import React, { useState } from 'react';
import type { StationWithDistance, LocationSearchResult } from '../types/index';
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
    <div className="neomorph-inset p-4 rounded-xl mt-4 animate-fade-in">
        <h2 className="text-lg font-bold text-gray-800 mb-3">검색 결과:</h2>
        <ul className="space-y-2 max-h-60 overflow-y-auto" role="listbox">
            {results.map((item, index) => (
                <li key={index} role="option" aria-selected="false">
                    <button
                        onClick={() => onSelect(item)}
                        className="w-full text-left p-3 neomorph-card hover:shadow-neomorph-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPinIcon className="w-4 h-4 flex-shrink-0 text-blue-600" />
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
          className="neomorph-input flex-grow disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || showResultsList || showFinalResult}
          aria-label="목적지 검색"
        />
        <div className="flex gap-2">
            <button
                type="submit"
                className="flex-1 sm:flex-none neomorph-btn-primary font-bold py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 sm:flex-none neomorph-btn font-bold py-3 px-4 flex items-center justify-center gap-2"
                    aria-label="다시 검색"
                >
                    <XIcon />
                    <span className="sm:hidden">초기화</span>
                </button>
            )}
        </div>
      </form>

      {error && <p className="text-red-600 bg-red-100 border-2 border-red-300 p-3 rounded-lg text-center font-medium" role="alert">{error}</p>}
      
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