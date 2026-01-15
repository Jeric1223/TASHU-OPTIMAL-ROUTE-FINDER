import React from "react";
import type { StationWithDistance } from "../types/index";
import { BicycleIcon, MapPinIcon } from "./icons";
import FavoriteButton from "./FavoriteButton";

interface StationCardProps {
    station: StationWithDistance;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
    return (
        <div className="neomorph-card p-5 space-y-4 animate-fade-in">
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800">{station.name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {station.distance !== undefined && (
                        <div className="text-base md:text-lg font-semibold text-blue-600 whitespace-nowrap">
                            <span>{station.distance.toFixed(2)} km</span>
                        </div>
                    )}
                    <FavoriteButton station={station} />
                </div>
            </div>
            <div className="text-sm space-y-2 text-gray-700">
                <div className="flex items-start gap-2">
                    <MapPinIcon className="flex-shrink-0 w-4 h-4 mt-0.5 text-blue-600" />
                    <span className="leading-snug">{station.address}</span>
                </div>
                <div className="flex items-center gap-2">
                    <BicycleIcon className="w-5 h-5 flex-shrink-0 text-blue-600" />
                    <span>
                        대여 가능 자전거: <span className="font-bold text-blue-600">{station.parking_count}</span>대
                    </span>
                </div>
            </div>
            <div className="pt-3 border-t border-neumorphic-dark border-opacity-20 flex flex-wrap justify-end gap-2">
                <a
                    href={`https://map.kakao.com/link/to/${encodeURIComponent(station.name)},${station.x_pos},${station.y_pos}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neomorph-btn text-sm hover:bg-yellow-100 transition-colors"
                    aria-label={`${station.name} 카카오맵으로 보기`}
                >
                    카카오맵
                </a>
                {typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                    <a
                        href={`nmap://place?lat=${station.x_pos}&lng=${station.y_pos}&zoom=16&name=${encodeURIComponent(
                            station.name
                        )}&appname=tashu.route.finder`}
                        className="neomorph-btn text-sm hover:bg-green-100 transition-colors"
                        aria-label={`${station.name} 네이버지도로 보기`}
                    >
                        네이버지도
                    </a>
                ) : (
                    <a
                        href={`https://map.naver.com/index.nhn?elng=${station.y_pos}&elat=${station.x_pos}&etext=${encodeURIComponent(
                            station.name
                        )}&menu=route&pathType=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="neomorph-btn text-sm hover:bg-green-100 transition-colors"
                        aria-label={`${station.name} 네이버지도로 보기`}
                    >
                        네이버지도
                    </a>
                )}
                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${station.x_pos},${station.y_pos}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neomorph-btn text-sm hover:bg-blue-100 transition-colors"
                    aria-label={`${station.name} 구글맵으로 보기`}
                >
                    구글맵
                </a>
            </div>
        </div>
    );
};

export default StationCard;
