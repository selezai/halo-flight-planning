import { featureSelectionKey } from '@/lib/openaip/featureSelection';
import type { ParsedFeature } from '@/types/openaip';

export function buildClickedFeatureStackKey(features: ParsedFeature[]): string {
  return features.map(featureSelectionKey).join('|');
}
