<script setup lang="ts">
import type { Track } from "../../../shared/chart";
import type { RelaySession } from "../../../shared/relay";
import { relayStatusLabel } from "../../../shared/relay";
defineProps<{
  tracks: Track[];
  firstId: string;
  secondId: string;
  canConfirm: boolean;
  session: RelaySession | null;
  active: boolean;
  locked: boolean;
  history: RelaySession[];
  error: string;
}>();
defineEmits<{
  first: [id: string];
  second: [id: string];
  swap: [];
  start: [];
  quit: [];
}>();
const titleOf = (tracks: Track[], id: string) =>
  tracks.find((t) => t.id === id)?.title ?? "未知曲目";
const isSettled = (s: RelaySession | null) =>
  !!s && (s.status === "complete" || s.status === "incomplete");
</script>
<template>
  <section class="relay panel">
    <div class="section-label">RELAY / 接力演出 <span>2 TRACKS</span></div>

    <template v-if="!session">
      <h3>一次两首，接力演出</h3>
      <p class="muted relay-intro">
        两局独立时钟，仅限正式速度。第一首结算后，确认再开第二首。
      </p>
      <div class="relay-picks">
        <label>
          <span class="relay-index">01</span>
          <select
            aria-label="第一首曲目"
            :disabled="locked"
            :value="firstId"
            @change="$emit('first', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>选择第一首</option>
            <option v-for="t in tracks" :key="t.id" :value="t.id">
              {{ t.title }} · Lv.{{ t.level }}
            </option>
          </select>
        </label>
        <span class="relay-arrow">→</span>
        <label>
          <span class="relay-index">02</span>
          <select
            aria-label="第二首曲目"
            :disabled="locked"
            :value="secondId"
            @change="$emit('second', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>选择第二首</option>
            <option v-for="t in tracks" :key="t.id" :value="t.id">
              {{ t.title }} · Lv.{{ t.level }}
            </option>
          </select>
        </label>
      </div>
      <div class="relay-actions">
        <button
          class="ghost"
          :disabled="!firstId && !secondId"
          @click="$emit('swap')"
        >
          ⇄ 交换顺序</button
        ><button
          class="primary relay-start"
          :disabled="!canConfirm || locked"
          @click="$emit('start')"
        >
          ▶ 开始接力演出
        </button>
      </div>
      <p v-if="firstId && firstId === secondId" class="relay-note invalid">
        两首曲目不能重复，请重新选择
      </p>
      <p v-else class="relay-note">
        锁定正式速度 · 中途退出会把接力标记为未完成
      </p>
    </template>

    <template v-else>
      <div class="relay-status" :class="session.status">
        <span>{{ relayStatusLabel[session.status] }}</span>
        <b v-if="session.status === 'intermission'">01 → 02</b>
        <b v-else-if="session.status === 'leg1'">1 / 2</b>
        <b v-else-if="session.status === 'leg2'">2 / 2</b>
        <b v-else-if="session.status === 'complete'">2 / 2 完成</b>
        <b v-else>未完成</b>
      </div>
      <div class="relay-legs">
        <div class="relay-leg">
          <span class="relay-index">01</span>
          <div class="relay-leg-main">
            <strong>{{ titleOf(tracks, session.firstTrackId) }}</strong>
            <small v-if="session.leg1">
              已完成 · {{ session.leg1.score.toLocaleString() }} 分 ·
              {{ session.leg1.accuracy.toFixed(2) }}%
            </small>
            <small v-else>{{
              session.status === "incomplete" ? "未完成" : "正在演奏"
            }}</small>
          </div>
          <span class="leg-mark" :class="{ done: session.leg1 }">{{
            session.leg1 ? "●" : "○"
          }}</span>
        </div>
        <div class="relay-leg">
          <span class="relay-index">02</span>
          <div class="relay-leg-main">
            <strong>{{ titleOf(tracks, session.secondTrackId) }}</strong>
            <small v-if="session.leg2">
              已完成 · {{ session.leg2.score.toLocaleString() }} 分 ·
              {{ session.leg2.accuracy.toFixed(2) }}%
            </small>
            <small v-else-if="session.status === 'intermission'"
              >已确定 · 等待确认开始</small
            >
            <small v-else-if="session.status === 'leg2'">正在演奏</small>
            <small v-else>{{ isSettled(session) ? "未完成" : "等待演奏" }}</small>
          </div>
          <span class="leg-mark" :class="{ done: session.leg2 }">{{
            session.leg2 ? "●" : "○"
          }}</span>
        </div>
      </div>
      <div class="relay-actions" v-if="active">
        <button class="ghost relay-quit" @click="$emit('quit')">
          退出接力 · 标记未完成
        </button>
      </div>      <p v-if="session.status === 'intermission'" class="relay-note">
        请在舞台准备页确认，第二首才会开始
      </p>
      <p v-else-if="session.status === 'incomplete'" class="relay-note invalid">
        {{
          session.leg1
            ? "已完成曲目的成绩仍保留，本次接力不计为完成"
            : "接力在第一首完成前结束，本次不计为完成"
        }}
      </p>
      <p v-else-if="session.status === 'leg1'" class="relay-note">
        第一首进行中 · 仅限正式速度
      </p>
      <p v-else-if="session.status === 'leg2'" class="relay-note">
        第二首进行中 · 独立时钟，连击从零开始
      </p>
      <p v-else class="relay-note">
        两首均已完成，本次接力计入完成状态
      </p>
    </template>

    <details v-if="history.length" class="relay-history">
      <summary>往期接力 · {{ history.length }}</summary>
      <div v-for="h in history" :key="h.id" class="history-row">
        <span
          >{{ titleOf(tracks, h.firstTrackId) }} →
          {{ titleOf(tracks, h.secondTrackId)
          }}<small>{{ relayStatusLabel[h.status] }} · {{
            h.leg1 ? h.leg1.score.toLocaleString() : "—"
          }} / {{ h.leg2 ? h.leg2.score.toLocaleString() : "—" }}</small></span
        ><b>{{ h.status === "complete" ? "完成" : "未完成" }}</b>
      </div>
    </details>
    <p v-if="error" class="warning">{{ error }}</p>
  </section>
</template>
