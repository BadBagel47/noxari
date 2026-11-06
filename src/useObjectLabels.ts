import {useLayoutEffect, useMemo, useRef} from 'react';
import {layoutObjectLabels, type ObjectLabelInput, type ObjectLabelPlacement} from './objectLabels';

export function useObjectLabels(labels: ObjectLabelInput[], width: number, height: number, exclusions: Parameters<typeof layoutObjectLabels>[3], language: string) {
  const context = `${width}|${height}|${language}`;
  const memory = useRef<{context: string; placements: Map<string, ObjectLabelPlacement>} | null>(null);
  const placements = useMemo(() => layoutObjectLabels(labels, width, height, exclusions,
    memory.current?.context === context ? memory.current.placements : undefined), [labels, width, height, exclusions, context]);
  // Publish only committed layouts; abandoned React renders cannot change slots.
  useLayoutEffect(() => { memory.current = {context, placements}; }, [context, placements]);
  return placements;
}
