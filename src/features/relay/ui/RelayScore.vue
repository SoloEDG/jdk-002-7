<script setup lang="ts">
import { computed } from "vue";
import type { RelaySession, RelayLegSummary } from "../../../shared/relay";
import { relayStatusLabel, relaySettled } from "../../../shared/relay";
import { rank } from "../../records";
const props = defineProps<{
  session: RelaySession | null;
  firstTitle: string;
  secondTitle: string;
}>();
const legs = computed<[RelayLegSummary | null, RelayLegSummary | null]>(() => [
  props.session?.leg1 ?? null,
  props.session?.leg2 ?? null,
]);
const complete = computed(() => props.session?.status === "complete");
const settled = computed(
  () => !!props.session && relaySettled(props.session),
);
const totalScore = computed(
  () => (props.session?.leg1?.score ?? 0) + (props.session?.leg2?.score ?? 0),
);
const title = (index: 0 | 1) => (index === 0 ? props.firstTitle : props.secondTitle);
const progress = computed(() => {
  const done = legs.value.filter(Boolean).length;
  return complete.value ? "2 / 2 完成" : settled.value ? "未完成" : `${done} / 2 已完成`;
});
const state = (index: 0 | 1) => {
  const leg = legs.value[index];
  if (leg) return `${leg.score.toLocaleString()} 分 · ${leg.accuracy.toFixed(2)}% · ${leg.maxCombo} 连击`;
  if (!props.session) return "";
  if (settled.value) return "未完成";
  const status = props.session.status;
  if (index === 0) return status === "leg1" ? "正在演奏" : "未完成";
  if (status === "leg1") return "等待确认";
  if (status === "intermission") return "已确定 · 等待确认开始";
  return "正在演奏";
};
const note = computed(() => {
  if (complete.value) return "两首都已完成，本次接力计入完成状态";
  if (!settled.value) return "接力进行中：第一首结算后，确认才会开始第二首";
  if (!legs.value.some(Boolean))
    return "接力在第一首完成前结束，本次没有可计入的曲目成绩";
  return "接力未完成：已完成曲目的成绩仍保留在成绩区";
});
</script>
<template>
  <section v-if="session" class="relay-score panel">
    <div class="section-label">
      RELAY RESULT / 接力成绩
      <span :class="{ green: complete }">{{
        relayStatusLabel[session.status]
      }}</span>
    </div>
    <div class="relay-total">
      <div>
        <small>{{ complete ? "接力总成绩" : "已完成曲目合计" }}</small>
        <b>{{ totalScore.toLocaleString() }}</b>
      </div>
      <span class="relay-flag" :class="{ complete }">{{ progress }}</span>
    </div>
    <div class="relay-result-list">
      <div v-for="i in ([0, 1] as const)" :key="i" class="relay-result">
        <span class="relay-index">0{{ i + 1 }}</span>
        <div class="relay-result-main">
          <strong>{{ title(i) }}</strong>
          <small :class="{ muted: !legs[i] }">{{ state(i) }}</small>
        </div>
        <b class="relay-rank">{{ legs[i] ? rank(legs[i]!.accuracy) : "—" }}</b>
      </div>
    </div>
    <p class="relay-note" :class="{ settled: complete }">{{ note }}</p>
  </section>
</template>
