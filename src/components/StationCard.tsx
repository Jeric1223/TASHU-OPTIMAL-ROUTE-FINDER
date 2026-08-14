import React from "react";
import type { StationWithDistance } from "../types/index";
import FavoriteButton from "./FavoriteButton";

interface StationCardProps {
    station: StationWithDistance;
    compact?: boolean;
    onSetAsStart?: (station: StationWithDistance) => void;
    onSetAsEnd?: (station: StationWithDistance) => void;
    onCardClick?: (station: StationWithDistance) => void;
}

// 카카오맵 URL (올바른 포맷: 도착지 설정)
const kakaoToUrl = (name: string, lat: number, lng: number) =>
    `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

// 네이버맵 URL
const naverUrl = (name: string, lat: number, lng: number) =>
    typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? `nmap://place?lat=${lat}&lng=${lng}&zoom=16&name=${encodeURIComponent(name)}&appname=tashu.route.finder`
        : `https://map.naver.com/index.nhn?elng=${lng}&elat=${lat}&etext=${encodeURIComponent(name)}&menu=route&pathType=1`;


const StationCard: React.FC<StationCardProps> = ({ station, compact = false, onSetAsStart, onSetAsEnd, onCardClick }) => {
    const distanceText = station.distance !== undefined
        ? station.distance < 1
            ? `${Math.round(station.distance * 1000)}m 거리`
            : `${station.distance.toFixed(1)}km 거리`
        : null;

    // ── 플로팅 Compact 카드 ──
    if (compact) {
        return (
            <div
                className="bg-white p-5 rounded-lg border border-outline-variant animate-slide-up cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => onCardClick?.(station)}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-primary-container text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                가장 가까움
                            </span>
                            {distanceText && (
                                <span className="text-on-surface-variant text-[11px] font-semibold">
                                    {distanceText}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-headline font-extrabold text-on-surface leading-tight">{station.name}</h2>
                        {station.address && (
                            <p className="text-on-surface-variant text-xs">{station.address}</p>
                        )}
                    </div>
                    <FavoriteButton station={station} />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black font-headline text-primary">{station.parking_count}</span>
                        <span className="text-xs text-on-surface-variant font-bold">대 대여 가능</span>
                    </div>
                    <a
                        href={kakaoToUrl(station.name, station.x_pos, station.y_pos)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-outline-variant text-on-surface font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all hover:bg-surface-container-low"
                    >
                        <span className="material-symbols-outlined text-sm filled text-primary">directions</span>
                        <span className="text-sm">카카오맵</span>
                    </a>
                </div>
            </div>
        );
    }

    // ── 풀 스테이션 카드 ──
    return (
        <div className="bg-white p-5 rounded-lg border border-outline-variant animate-fade-in">
            {/* 헤더 */}
            <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-primary-container text-on-primary-container text-[11px] font-semibold px-2.5 py-1 rounded-full">
                            운영중
                        </span>
                        {distanceText && (
                            <span className="text-on-surface-variant text-[11px] font-medium">
                                {distanceText}
                            </span>
                        )}
                    </div>
                    <h3 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                        {station.name}
                    </h3>
                    {station.address && (
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">near_me</span>
                            <p className="font-body text-sm font-medium">{station.address}</p>
                        </div>
                    )}
                </div>
                <FavoriteButton station={station} />
            </div>

            {/* 통계 그리드 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-primary-container rounded-lg p-4 flex flex-col items-center border border-primary/10">
                    <span className="text-primary font-headline text-4xl font-black mb-0.5">{station.parking_count}</span>
                    <span className="font-label text-[11px] font-semibold text-primary">대여 가능 자전거</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onSetAsStart?.(station)}
                        className="bg-primary-container text-primary rounded-lg p-3 flex flex-col items-center justify-center hover:brightness-95 active:scale-95 transition-all border border-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg mb-0.5">place</span>
                        <span className="font-label text-[10px] font-semibold">시작점</span>
                    </button>
                    <button
                        onClick={() => onSetAsEnd?.(station)}
                        className="bg-primary-container text-primary rounded-lg p-3 flex flex-col items-center justify-center hover:brightness-95 active:scale-95 transition-all border border-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg mb-0.5">flag</span>
                        <span className="font-label text-[10px] font-semibold">도착점</span>
                    </button>
                </div>
            </div>

            {/* 지도 앱 길찾기 버튼들 — 색블록/이모지 없이 모노라인 */}
            <div className="grid grid-cols-2 gap-3">
                <a href={kakaoToUrl(station.name, station.x_pos, station.y_pos)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 rounded-lg border border-outline-variant hover:bg-surface-container-low active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-base text-primary">near_me</span>
                    <span className="text-[13px] font-semibold text-on-surface">카카오맵</span>
                </a>
                <a href={naverUrl(station.name, station.x_pos, station.y_pos)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 rounded-lg border border-outline-variant hover:bg-surface-container-low active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-base text-primary">near_me</span>
                    <span className="text-[13px] font-semibold text-on-surface">네이버지도</span>
                </a>
            </div>

        </div>
    );
};

export default StationCard;
