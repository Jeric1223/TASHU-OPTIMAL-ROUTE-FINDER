// @ts-nocheck
import React from "react";
import type { StationWithDistance } from "../types";
import { BicycleIcon, MapPinIcon } from "./icons";

interface StationCardProps {
    station: StationWithDistance;
}

const StationCard: React.FC<StationCardProps> = ({ station }) => {
    return (
        <div className="bg-white rounded-xl p-4 md:p-5 border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:border-blue-300">
            <div className="flex justify-between items-start gap-3">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 flex-1">{station.name}</h3>
                {station.distance !== undefined && (
                    <div className="text-base md:text-lg font-semibold text-blue-600 whitespace-nowrap pt-1">
                        <span>{station.distance.toFixed(2)} km</span>
                    </div>
                )}
            </div>
            <div className="text-sm text-gray-600 space-y-2 mt-2">
                <div className="flex items-start gap-2">
                    <MapPinIcon className="flex-shrink-0 w-4 h-4 mt-0.5" />
                    <span className="leading-snug">{station.address}</span>
                </div>
                <div className="flex items-center gap-2">
                    <BicycleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>
                        대여 가능 자전거: <span className="font-bold text-gray-800">{station.parking_count}</span>대
                    </span>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap justify-end gap-2">
                <a
                    href={`https://map.kakao.com/link/to/${encodeURIComponent(station.name)},${station.x_pos},${station.y_pos}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 hover:bg-yellow-400 hover:text-black text-gray-700 text-sm font-medium py-2 px-4 rounded-full transition-colors"
                    aria-label={`${station.name} 카카오맵으로 보기`}
                >
                    카카오맵
                </a>
                {typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                    <a
                        href={`nmap://place?lat=${station.x_pos}&lng=${station.y_pos}&zoom=16&name=${encodeURIComponent(
                            station.name
                        )}&appname=tashu.route.finder`}
                        className="bg-gray-100 hover:bg-green-500 hover:text-white text-gray-700 text-sm font-medium py-2 px-4 rounded-full transition-colors"
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
                        className="bg-gray-100 hover:bg-green-500 hover:text-white text-gray-700 text-sm font-medium py-2 px-4 rounded-full transition-colors"
                        aria-label={`${station.name} 네이버지도로 보기`}
                    >
                        네이버지도
                    </a>
                )}
                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${station.x_pos},${station.y_pos}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 hover:bg-blue-500 hover:text-white text-gray-700 text-sm font-medium py-2 px-4 rounded-full transition-colors"
                    aria-label={`${station.name} 구글맵으로 보기`}
                >
                    구글맵
                </a>
            </div>
        </div>
    );
};

export default StationCard;
