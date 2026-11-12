import { computed, onMounted, onUnmounted, ref } from "vue";
import { useLibrary } from "../features/library";
import { usePerformance } from "../features/performance";
import { useJudgment, bindInput } from "../features/judgment";
import { usePractice } from "../features/practice";
import { useRecords, makeResult } from "../features/records";
import { useRelay, makeLegSummary } from "../features/relay";
import { relayStatusLabel } from "../shared/relay";
import { makeRun } from "../shared/session";
import type { PracticeConfig, Run } from "../shared/session";
import type { Lane, Track } from "../shared/chart";

export function useWorkspace() {
  const library = useLibrary(),
    practice = usePractice(),
    judgment = useJudgment(),
    records = useRecords(),
    relay = useRelay(),
    error = ref("");
  const performance = usePerformance(
    (t) => judgment.tick(t),
    () => finishRun(),
  );
  const locked = computed(
    () =>
      performance.phase.value === "playing" ||
      performance.phase.value === "paused" ||
      relay.active.value,
  );
  const relayIntermission = computed(
    () => relay.session.value?.status === "intermission",
  );
  /** Which track the stage shows: a relay leg, else the last performed track. */
  const stageTrack = computed<Track>(() => {
    const session = relay.session.value;
    if (session) {
      const id =
        session.status === "leg1"
          ? session.firstTrackId
          : session.secondTrackId;
      return library.allTracks.find((t) => t.id === id) ?? library.selected.value;
    }
    return performance.run.value?.track ?? library.selected.value;
  });
  const relayBadge = computed(() =>
    relay.session.value
      ? relayStatusLabel[relay.session.value.status]
      : "自由演出",
  );
  const relayFirstTitle = computed(() => {
    const session = relay.display.value;
    if (!session) return "";
    return (
      library.allTracks.find((t) => t.id === session.firstTrackId)?.title ?? ""
    );
  });
  const relaySecondTitle = computed(() => {
    const session = relay.display.value;
    if (!session) return "";
    return (
      library.allTracks.find((t) => t.id === session.secondTrackId)?.title ?? ""
    );
  });
  function finishRun() {
    const run = performance.run.value;
    if (!run) return;
    const result = makeResult(run, judgment.hits.value, judgment.stats.value);
    records.commit(result);
    if (run.relayId && run.relayLeg)
      relay.settleLeg(run.relayLeg, makeLegSummary(run.relayLeg, result));
  }
  function standardRun(track: Track = library.selected.value) {
    return makeRun(track, practice.config.value);
  }
  /** A relay leg is always a full, formal-speed run on its own clock. */
  function relayRun(leg: 1 | 2, track: Track, relayId: string): Run {
    return {
      ...makeRun(track, { enabled: false, speed: 1, start: 0, end: track.beats }),
      relayId,
      relayLeg: leg,
    };
  }
  async function launch(run: Run) {
    judgment.reset(run);
    error.value = "";
    try {
      await performance.start(run);
    } catch {
      error.value = "音频未能启动，请再次点击开始";
      performance.reset();
      throw new Error("audio-failed");
    }
  }
  async function start() {
    if (relay.active.value) return;
    // Replay the track the stage is showing (e.g. the second relay leg after
    // the relay settled), not a library pick made since.
    try {
      await launch(standardRun(stageTrack.value));
    } catch {}
  }
  async function startRelay() {
    if (locked.value) return;
    const first = library.allTracks.find((t) => t.id === relay.firstId.value);
    const second = library.allTracks.find(
      (t) => t.id === relay.secondId.value,
    );
    if (!first || !second || first.id === second.id) {
      relay.error.value = "请选择两首不同的曲目";
      return;
    }
    const session = relay.begin(first, second);
    if (!session) return;
    try {
      await launch(relayRun(1, first, session.id));
    } catch {
      relay.cancelBegin();
    }
  }
  async function confirmRelay() {
    const session = relay.session.value;
    if (!session || session.status !== "intermission") return;
    const second = library.allTracks.find(
      (t) => t.id === session.secondTrackId,
    );
    if (!second) return;
    relay.resumeLeg2();
    try {
      await launch(relayRun(2, second, session.id));
    } catch {
      relay.revertIntermission();
    }
  }
  function quitRelay() {
    if (!relay.active.value) return;
    relay.quit();
    performance.reset();
    judgment.clearHeld();
    judgment.reset(standardRun());
  }
  function select(id: string) {
    if (locked.value) return;
    library.select(id);
    practice.reset(library.selected.value.beats);
    performance.reset();
    judgment.reset(standardRun());
  }
  function down(lane: Lane) {
    if (performance.phase.value === "playing")
      judgment.down(lane, performance.time.value);
  }
  function up(lane: Lane) {
    if (performance.phase.value === "playing")
      judgment.up(lane, performance.time.value);
  }
  function pause() {
    performance.pause();
    judgment.clearHeld();
  }
  function toggle() {
    if (performance.phase.value === "playing") pause();
    else if (performance.phase.value === "paused") void performance.resume();
  }
  function updatePractice(patch: Partial<PracticeConfig>) {
    if (!locked.value) practice.update(patch, library.selected.value.beats);
  }
  let cleanup = () => {};
  const blur = () => {
    if (performance.phase.value === "playing") pause();
  };
  onMounted(() => {
    cleanup = bindInput(down, up, toggle);
    window.addEventListener("blur", blur);
  });
  onUnmounted(() => {
    cleanup();
    window.removeEventListener("blur", blur);
    performance.reset();
  });
  return {
    library,
    practice,
    judgment,
    records,
    relay,
    performance,
    locked,
    relayIntermission,
    stageTrack,
    relayBadge,
    relayFirstTitle,
    relaySecondTitle,
    error,
    start,
    startRelay,
    confirmRelay,
    quitRelay,
    select,
    down,
    up,
    pause,
    updatePractice,
  };
}
