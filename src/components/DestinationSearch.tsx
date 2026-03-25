import React, { useState, useEffect, useRef } from 'react';
import type { StationWithDistance, LocationSearchResult } from '../types/index';
import StationCard from './StationCard';
import { searchKakaoLocation } from '../services/kakoApiService';

interface DestinationSearchProps {
  onSearch: (destination: string) => Promise<void>;
  onSelectResult: (result: LocationSearchResult) => void;
  onClear: () => void;
  onBack: () => void;
  searchResults: LocationSearchResult[] | null;
  result: StationWithDistance | null;
  loading: boolean;
  error: string | null;
}

const DestinationSearch: React.FC<DestinationSearchProps> = ({
    onSelectResult,
    onClear,
    onBack,
    result,
    loading,
    error
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSearchResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 오버레이 열릴 때 자동 포커스
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      try {
        const results = await searchKakaoLocation(query);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (item: LocationSearchResult) => {
    setQuery(item.name);
    setSuggestions([]);
    setShowDropdown(false);
    onSelectResult(item);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear();
  };

  const showFinalResult = result && !loading;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col animate-fade-in pt-safe">
      {/* Dimmed map background */}
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center px-4 h-14 mt-2 sm:mt-4 mx-4 bg-white/85 backdrop-blur-xl rounded-full shadow-breathe">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1 flex justify-center">
            <h1 className="font-headline font-extrabold text-xl text-primary">타슈</h1>
          </div>
          <div className="w-10" />
        </header>

        {/* Search + Results */}
        <div className="flex-1 overflow-y-auto pt-6 px-5 pb-32 no-scrollbar">
          {/* Search Input */}
          <div ref={wrapperRef} className="relative mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                {isFetching
                  ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-primary">near_me</span>
                }
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (showFinalResult) onClear();
                }}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="어디로 갈까요?"
                className="w-full h-16 pl-14 pr-12 bg-white/85 glass-panel rounded-xl text-base font-semibold text-on-surface placeholder:text-outline border-none focus:outline-none focus:ring-4 focus:ring-primary/10 breathe-shadow transition-all"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={handleClear}
                  className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="search-dropdown mt-1">
                {suggestions.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="search-dropdown-item" onClick={() => handleSelect(item)}>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5 text-sm">location_on</span>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{item.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{item.roadAddress || item.address}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-box mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {showFinalResult ? (
            <div className="animate-slide-up">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 px-1">가장 가까운 반납 정류소</p>
              <StationCard station={result} />
            </div>
          ) : (
            <>
              {/* 안내 문구 */}
              {!query && (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-primary/30 block mb-3">search</span>
                  <p className="text-on-surface-variant font-medium">목적지를 검색하면</p>
                  <p className="text-on-surface-variant font-medium">가장 가까운 타슈 정류소를 찾아드려요</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationSearch;
