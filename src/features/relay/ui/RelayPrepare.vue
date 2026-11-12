<script setup lang="ts">
import type { Track } from "../../../shared/chart";
import type { RelayLegSummary } from "../../../shared/relay";
import { rank } from "../../records";
defineProps<{
  track: Track;
  leg1: RelayLegSummary | null;
}>();
defineEmits<{ confirm: []; abort: [] }>();
</script>
<template>
  <div class="relay-prep">
    <div class="relay-prep-head">
      <span>INTERMISSION / 接力准备</span><b>01 → 02</b>
    </div>
    <div class="relay-prep-body">
      <div v-if="leg1" class="leg-done">
        <small>第一首已完成</small>
        <strong>{{ leg1.title }}</strong>
        <span
          >{{ rank(leg1.accuracy) }} · {{ leg1.score.toLocaleString() }} 分 ·
          {{ leg1.accuracy.toFixed(2) }}% · {{ leg1.maxCombo }} 连击</span
        >
      </div>
      <div class="leg-next">
        <small>下一首 / 第二首</small>
        <strong>{{ track.title }}</strong>
        <span>{{ track.artist }} · {{ track.bpm }} BPM · Lv.{{ track.level }}</span>
        <em>独立时钟重新起拍 · 正式速度 · 连击从零开始</em>
      </div>
    </div>
    <div class="relay-prep-actions">
      <button class="primary" @click="$emit('confirm')">确认，开始第二首</button
      ><button class="ghost" @click="$emit('abort')">结束接力</button>
    </div>
    <p class="relay-note">确认前第二首不会播放，也无法替换当前接力曲目</p>
  </div>
</template>
