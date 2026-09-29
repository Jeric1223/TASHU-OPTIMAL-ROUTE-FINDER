import { useEffect, useState } from 'react';

// 0에서 목표값까지 감속하며 올라가는 숫자. 모션 줄이기 설정이면 바로 목표값.
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useCountUp = (target: number, ms = 600): number => {
    // 처음부터 목표값을 보여주면 0으로 떨어졌다 올라오는 깜빡임이 생긴다
    const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
    useEffect(() => {
        if (target === 0 || prefersReducedMotion()) {
            setValue(target);
            return;
        }
        let raf = 0;
        const t0 = performance.now();
        const step = (t: number) => {
            const p = Math.min(1, (t - t0) / ms);
            setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, ms]);
    return value;
};
