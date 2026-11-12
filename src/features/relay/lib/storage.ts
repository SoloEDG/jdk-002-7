import type { RelaySession } from "../../../shared/relay";

const KEY = "pulse-relays-v1";

function isLeg(value: unknown, leg: 1 | 2): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.leg === leg &&
    typeof v.trackId === "string" &&
    typeof v.title === "string" &&
    typeof v.score === "number" &&
    typeof v.accuracy === "number"
  );
}

function isSession(value: unknown): value is RelaySession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.firstTrackId === "string" &&
    typeof v.secondTrackId === "string" &&
    typeof v.startedAt === "number" &&
    typeof v.status === "string" &&
    isLeg(v.leg1, 1) &&
    isLeg(v.leg2, 2)
  );
}

export function loadRelays(): RelaySession[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(list)) return [];
    return list
      .filter(isSession)
      .map((session) =>
        // A reload killed the audio transport: any leg still marked as
        // running can no longer be continued, so it is settled as incomplete.
        session.status === "leg1" ||
        session.status === "intermission" ||
        session.status === "leg2"
          ? { ...session, status: "incomplete" as const, finishedAt: Date.now() }
          : session,
      )
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function saveRelays(sessions: RelaySession[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 12)));
    return true;
  } catch {
    return false;
  }
}
