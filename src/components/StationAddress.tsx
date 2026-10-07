import React from 'react';
import type { Station } from '../types';
import { useStationAddress } from '../hooks/useStationAddress';

/** 정류소 보조 문구(주소). 주소가 없으면 좌표→주소 변환 결과, 그것도 없으면 정류소 번호. */
const StationAddress: React.FC<{ station: Station; enabled?: boolean }> = ({ station, enabled = true }) => <>{useStationAddress(station, enabled)}</>;

export default StationAddress;
