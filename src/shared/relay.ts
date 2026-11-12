export type RelayStatus =
  | "leg1"
  | "intermission"
  | "leg2"
  | "complete"
  | "incomplete";

export type RelayLegSummary = {
  leg: 1 | 2;
  trackId: string;
  title: string;
  at: number;
  score: number;
  accuracy: number;
  maxCombo: number;
  resultId: string;
};

export type RelaySession = {
  id: string;
  firstTrackId: string;
  secondTrackId: string;
  startedAt: number;
  finishedAt: number | null;
  status: RelayStatus;
  leg1: RelayLegSummary | null;
  leg2: RelayLegSummary | null;
};

export const relayStatusLabel: Record<RelayStatus, string> = {
  leg1: "第一首进行中",
  intermission: "准备第二首",
  leg2: "第二首进行中",
  complete: "接力完成",
  incomplete: "接力未完成",
};

export function relaySettled(session: RelaySession) {
  return session.status === "complete" || session.status === "incomplete";
}
