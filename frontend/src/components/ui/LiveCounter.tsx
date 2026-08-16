/* ═══════════════════════════════════════════════════════════
   LiveCounter — Animated number counter
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';

interface LiveCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  decimals?: number;
}

export default function LiveCounter({
  value,
  duration = 600,
  format,
  className = '',
  decimals = 0,
}: LiveCounterProps) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;

    if (diff === 0) return;

    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;

      setDisplayed(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = end;
      }
    }

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, decimals]);

  const displayText = format ? format(displayed) : displayed.toLocaleString('en-US');

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {displayText}
    </span>
  );
}
