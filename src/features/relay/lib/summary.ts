import type { Result } from "../../../shared/session";
import type { RelayLegSummary } from "../../../shared/relay";

export function makeLegSummary(leg: 1 | 2, result: Result): RelayLegSummary {
  return {
    leg,
    trackId: result.trackId,
    title: result.title,
    at: result.at,
    score: result.score,
    accuracy: result.accuracy,
    maxCombo: result.maxCombo,
    resultId: result.id,
  };
}
