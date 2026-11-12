import { computed, ref } from "vue";
import type { Track } from "../../../shared/chart";
import type { RelaySession, RelayLegSummary, RelayStatus } from "../../../shared/relay";
import { loadRelays, saveRelays } from "../lib/storage";

const isRunning = (status: RelayStatus) =>
  status === "leg1" || status === "intermission" || status === "leg2";

export function useRelay() {
  const sessions = ref<RelaySession[]>(loadRelays()),
    firstId = ref(""),
    secondId = ref(""),
    error = ref("");

  /** The relay currently in progress, if any. Only one can run at a time. */
  const session = computed(
    () => sessions.value.find((s) => isRunning(s.status)) ?? null,
  );
  const active = computed(() => session.value !== null);
  /** Newest settled relay: its leg results stay on the score board. */
  const latestSettled = computed(
    () => sessions.value.find((s) => !isRunning(s.status)) ?? null,
  );
  /** What the relay score board shows: running relay first, else last settled. */
  const display = computed(() => session.value ?? latestSettled.value);
  const canConfirm = computed(
    () =>
      firstId.value !== "" &&
      secondId.value !== "" &&
      firstId.value !== secondId.value,
  );
  const otherSessions = computed(() =>
    sessions.value.filter(
      (s) =>
        s.id !== session.value?.id &&
        (session.value !== null || s.id !== latestSettled.value?.id),
    ),
  );

  function persist() {
    if (!saveRelays(sessions.value))
      error.value = "存储空间不足，接力记录仅在当前页面保留";
  }
  function replace(next: RelaySession) {
    sessions.value = sessions.value.map((s) => (s.id === next.id ? next : s));
  }
  function updateFirst(id: string) {
    if (active.value) return;
    firstId.value = id;
    error.value = "";
  }
  function updateSecond(id: string) {
    if (active.value) return;
    secondId.value = id;
    error.value = "";
  }
  function swap() {
    if (active.value) return;
    const first = firstId.value;
    firstId.value = secondId.value;
    secondId.value = first;
    error.value = "";
  }
  function begin(first: Track, second: Track): RelaySession | null {
    if (active.value || first.id === second.id) return null;
    const next: RelaySession = {
      id: crypto.randomUUID(),
      firstTrackId: first.id,
      secondTrackId: second.id,
      startedAt: Date.now(),
      finishedAt: null,
      status: "leg1",
      leg1: null,
      leg2: null,
    };
    sessions.value = [next, ...sessions.value].slice(0, 12);
    error.value = "";
    persist();
    return next;
  }
  /** Audio failed on leg one; drop the just-created session. */
  function cancelBegin() {
    const current = session.value;
    if (!current || current.leg1 || current.leg2) return;
    sessions.value = sessions.value.filter((s) => s.id !== current.id);
    persist();
  }
  function settleLeg(leg: 1 | 2, summary: RelayLegSummary) {
    const current = session.value;
    if (!current) return;
    if (leg === 1 && current.status === "leg1")
      replace({ ...current, leg1: summary, status: "intermission" });
    else if (leg === 2 && current.status === "leg2")
      replace({
        ...current,
        leg2: summary,
        status: "complete",
        finishedAt: Date.now(),
      });
    else return;
    persist();
  }
  function resumeLeg2() {
    const current = session.value;
    if (!current || current.status !== "intermission") return;
    replace({ ...current, status: "leg2" });
    persist();
  }
  function revertIntermission() {
    const current = session.value;
    if (!current || current.status !== "leg2" || current.leg2) return;
    replace({ ...current, status: "intermission" });
    persist();
  }
  function quit() {
    const current = session.value;
    if (!current) return;
    replace({
      ...current,
      status: "incomplete",
      finishedAt: Date.now(),
    });
    persist();
  }
  return {
    sessions,
    session,
    active,
    latestSettled,
    display,
    firstId,
    secondId,
    canConfirm,
    otherSessions,
    error,
    updateFirst,
    updateSecond,
    swap,
    begin,
    cancelBegin,
    settleLeg,
    resumeLeg2,
    revertIntermission,
    quit,
  };
}
