/**
 * useCountUp - Smooth number counting animation using requestAnimationFrame
 * Terminal-style polished counting effect
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  enabled?: boolean;
}

export function useCountUp(
  end: number,
  options: UseCountUpOptions = {}
): string {
  const {
    duration = 800,
    decimals = 0,
    prefix = '',
    suffix = '',
    separator = ',',
    enabled = true,
  } = options;

  const [displayValue, setDisplayValue] = useState(0);
  const startValueRef = useRef(0);
  const endValueRef = useRef(end);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const formatNumber = useCallback((num: number): string => {
    const fixed = num.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return `${prefix}${decPart ? `${formatted}.${decPart}` : formatted}${suffix}`;
  }, [decimals, prefix, suffix, separator]);

  const easeOutExpo = (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutExpo(progress);

    const currentValue = startValueRef.current + (endValueRef.current - startValueRef.current) * easedProgress;
    setDisplayValue(currentValue);

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [duration]);

  useEffect(() => {
    if (!enabled || end === endValueRef.current) return;

    startValueRef.current = displayValue;
    endValueRef.current = end;
    startTimeRef.current = null;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, enabled, animate, displayValue]);

  // Initial mount - start from 0
  useEffect(() => {
    if (enabled && end > 0) {
      startValueRef.current = 0;
      endValueRef.current = end;
      startTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return formatNumber(displayValue);
}

// Format large numbers with K/M/B suffix
export function formatCompact(num: number): { value: number; suffix: string } {
  if (num >= 1e9) return { value: num / 1e9, suffix: 'B' };
  if (num >= 1e6) return { value: num / 1e6, suffix: 'M' };
  if (num >= 1e3) return { value: num / 1e3, suffix: 'K' };
  return { value: num, suffix: '' };
}

// Hook for compact number counting (with K/M/B)
export function useCompactCountUp(
  end: number | null,
  options: Omit<UseCountUpOptions, 'suffix'> = {}
): string {
  const { value, suffix } = formatCompact(end || 0);
  const decimals = suffix ? 2 : 0;
  
  return useCountUp(value, {
    ...options,
    decimals: options.decimals ?? decimals,
    suffix,
    enabled: end !== null && end > 0,
  });
}
