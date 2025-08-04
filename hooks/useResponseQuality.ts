import { useState, useEffect, useMemo } from 'react';
import { calculateResponseQuality, QualityScore } from '@/lib/response-quality';

export function useResponseQuality(responseText: string, debounceMs: number = 300) {
  const [debouncedText, setDebouncedText] = useState(responseText);

  // Debounce the response text to avoid excessive calculations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(responseText);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [responseText, debounceMs]);

  // Calculate quality score based on debounced text
  const quality = useMemo(() => {
    return calculateResponseQuality(debouncedText);
  }, [debouncedText]);

  return quality;
}