<template>
  <!-- ═══════════════════════════════════════════════════════
       멀티 배틀 로비 셸 — 방 입장 / 대기 / 카운트다운 / 결과
  ═══════════════════════════════════════════════════════ -->
  <div class="flex flex-col items-center gap-6 py-6 select-none">

    <!-- ── Phase 0: 방 진입 ─────────────────────────────── -->
    <Transition name="phase-fade" mode="out-in">
      <div v-if="!code" key="enter" class="flex w-full max-w-sm flex-col gap-4">

        <!-- 게임 타이틀 칩 -->
        <div class="flex items-center justify-center gap-2">
          <span class="rounded-full border border-zone-accent/40 bg-zone-accent/10 px-3.5 py-1 font-mono text-xs font-bold text-zone-accent">
            ⚡ MULTI BATTLE
          </span>
          <span v-if="maxPlayers" class="text-xs text-muted-foreground font-mono">최대 {{ maxPlayers }}인</span>
        </div>

        <!-- 방 만들기 -->
        <button
            class="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-zone-accent px-6 py-4 font-bold text-white shadow-[0_0_30px_color-mix(in_oklch,var(--zone-accent)_40%,transparent)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_color-mix(in_oklch,var(--zone-accent)_55%,transparent)] active:translate-y-0 active:scale-[0.99]"
            :data-testid="`${testidPrefix}-create`"
            type="button"
            @click="$emit('create')"
        >
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity group-hover:opacity-100"/>
          <Plus class="size-4 shrink-0"/>
          <span class="text-sm">방 만들기</span>
        </button>

        <!-- 구분선 -->
        <div class="flex items-center gap-3">
          <div class="h-px flex-1 bg-border/50"/>
          <span class="text-[11px] font-mono text-muted-foreground">대기중인 방</span>
          <div class="h-px flex-1 bg-border/50"/>
        </div>

        <!-- 대기방 목록 -->
        <p
            v-if="rooms.length === 0"
            :data-testid="`${testidPrefix}-room-empty`"
            class="rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-5 text-center text-xs text-muted-foreground"
        >
          대기 중인 방이 없어요. 새로 만들어보세요!
        </p>
        <div v-else :data-testid="`${testidPrefix}-room-list`" class="flex flex-col gap-2">
          <button
              v-for="room in rooms"
              :key="room.code"
              :data-testid="`${testidPrefix}-room-item`"
              class="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left transition-[border-color,background-color] hover:border-zone-accent/50 hover:bg-zone-accent/10 active:scale-[0.99]"
              type="button"
              @click="$emit('join', room.code)"
          >
            <span class="font-mono text-xs font-medium text-muted-foreground">방 {{ room.code }}</span>
            <span class="flex items-center gap-1.5 font-mono text-xs font-bold text-zone-accent">
              <Users class="size-3.5"/>
              {{ room.participantCount }} / {{ room.maxParticipants }}
            </span>
          </button>
        </div>

        <!-- 에러 -->
        <p
            v-if="error"
            :data-testid="`${testidPrefix}-error`"
            class="flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          <AlertCircle class="size-3.5 shrink-0"/>
          {{ error }}
        </p>
      </div>

      <!-- ── Phase 1: 대기실 ──────────────────────────────── -->
      <div v-else-if="phase === 'lobby'" key="lobby" class="flex w-full max-w-sm flex-col items-center gap-5">

        <!-- 방 코드 카드 -->
        <div class="flex w-full flex-col items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-5 backdrop-blur-md">
          <p class="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">방 코드 · Room Code</p>
          <div class="flex items-center gap-3">
            <span
                :data-testid="`${testidPrefix}-code-display`"
                class="font-mono text-4xl font-black tracking-[0.3em] text-zone-accent drop-shadow-[0_0_12px_var(--zone-accent)]"
            >{{ code }}</span>
            <button
                class="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground transition-[background-color,color] hover:bg-zone-accent/10 hover:text-zone-accent active:scale-95"
                title="코드 복사"
                type="button"
                @click="copyCode"
            >
              <CheckCheck v-if="copied" class="size-4 text-emerald-500"/>
              <Copy v-else class="size-4"/>
            </button>
          </div>
          <p class="text-[11px] text-muted-foreground">이 코드를 친구에게 공유하세요</p>
        </div>

        <!-- 참가자 목록 -->
        <div class="flex w-full flex-col gap-2">
          <p class="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            참가자 {{ participants.length }} / {{ maxPlayers ?? 5 }}
          </p>
          <div :data-testid="`${testidPrefix}-participants`" class="flex flex-col gap-1.5">
            <div
                v-for="(p, i) in paddedParticipants"
                :key="p?.id ?? `empty-${i}`"
                class="flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-[border-color,background-color]"
                :class="p
                  ? 'border-border/60 bg-muted/20 backdrop-blur-sm'
                  : 'border-dashed border-border/30 bg-transparent'"
            >
              <!-- 자리 번호 -->
              <span class="font-mono text-xs font-bold text-muted-foreground/50 w-4 shrink-0">{{ i + 1 }}</span>
              <!-- 아바타 -->
              <div
                  class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="p ? PLAYER_COLORS[i % PLAYER_COLORS.length].avatar : 'border border-dashed border-border/40 text-muted-foreground/30'"
              >
                {{ p ? p.nickname.charAt(0).toUpperCase() : '?' }}
              </div>
              <!-- 닉네임 -->
              <span
                  class="flex-1 truncate text-sm font-medium"
                  :class="p ? 'text-foreground' : 'text-muted-foreground/30 italic text-xs'"
              >{{ p ? p.nickname : '대기 중...' }}</span>
              <!-- 방장 뱃지 -->
              <span
                  v-if="p && i === 0"
                  class="shrink-0 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-500"
              >방장</span>
            </div>
          </div>
        </div>

        <!-- 방장 전용 시작 / 대기자 메시지 -->
        <button
            v-if="isHost"
            :disabled="participants.length < 2"
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-zone-accent py-3.5 font-bold text-white shadow-[0_0_25px_color-mix(in_oklch,var(--zone-accent)_35%,transparent)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_color-mix(in_oklch,var(--zone-accent)_50%,transparent)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            :data-testid="`${testidPrefix}-start`"
            type="button"
            @click="$emit('start')"
        >
          <Rocket class="size-4 shrink-0"/>
          <span class="text-sm">{{ participants.length < 2 ? '2인 이상 필요' : '대결 시작!' }}</span>
        </button>
        <div v-else class="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
          <span class="flex size-2 rounded-full bg-amber-400 animate-pulse"/>
          <p class="text-xs text-muted-foreground font-mono">방장이 시작하기를 기다리는 중</p>
        </div>
      </div>

      <!-- ── Phase 2: 카운트다운 ─────────────────────────── -->
      <div v-else-if="phase === 'countdown'" key="countdown" class="flex flex-col items-center gap-4">
        <p class="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">게임 시작까지</p>
        <div
            class="flex size-28 items-center justify-center rounded-full border-4 border-zone-accent/60 bg-zone-accent/10 font-mono text-6xl font-black text-zone-accent shadow-[0_0_40px_color-mix(in_oklch,var(--zone-accent)_40%,transparent)] backdrop-blur-sm"
        >
          {{ countdown }}
        </div>
        <p class="text-xs text-muted-foreground">준비하세요!</p>
      </div>

      <!-- ── Phase 3: 게임 중 (슬롯 위임) ───────────────── -->
      <div v-else-if="phase === 'playing'" key="playing" class="w-full">
        <slot/>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {AlertCircle, CheckCheck, Copy, Plus, Rocket, Users} from 'lucide-vue-next'
import {listRooms, type RoomSummary} from '../../api/games'

interface Participant {
  id: string
  nickname: string
}

const props = withDefaults(defineProps<{
  gameId: string
  code?: string | null
  phase?: 'lobby' | 'countdown' | 'playing'
  participants?: Participant[]
  isHost?: boolean
  error?: string | null
  maxPlayers?: number
  countdown?: number
  testidPrefix: string
}>(), {
  code: null,
  phase: 'lobby',
  participants: () => [],
  isHost: false,
  error: null,
  maxPlayers: 5,
  countdown: 3,
})

defineEmits<{
  create: []
  join: [code: string]
  start: []
}>()

const copied = ref(false)

// 코드 입력 대신 대기중인 공개방 목록에서 골라 참가한다 — 방에 들어가기 전(Phase 0)에만
// 폴링한다(SSE는 이미 입장한 방 전용이라, 아직 안 들어간 로비 목록 갱신에는 못 쓴다).
const ROOM_LIST_POLL_MS = 3000
const rooms = ref<RoomSummary[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

async function refreshRooms() {
  try {
    rooms.value = await listRooms(props.gameId)
  } catch {
    // 목록 갱신 실패는 조용히 무시 — 다음 폴링에서 다시 시도
  }
}

function startPolling() {
  stopPolling()
  refreshRooms()
  pollTimer = setInterval(refreshRooms, ROOM_LIST_POLL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  if (!props.code) startPolling()
})
onUnmounted(stopPolling)
watch(() => props.code, (code) => {
  if (code) stopPolling()
  else startPolling()
})

// 빈 슬롯 포함한 참가자 배열 (maxPlayers 길이)
const paddedParticipants = computed(() => {
  const arr: (Participant | null)[] = [...props.participants]
  while (arr.length < (props.maxPlayers ?? 5)) arr.push(null)
  return arr
})

// 5인 시그니처 컬러 팔레트
const PLAYER_COLORS = [
  {avatar: 'bg-blue-500/20 text-blue-400 border border-blue-500/40'},
  {avatar: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'},
  {avatar: 'bg-purple-500/20 text-purple-400 border border-purple-500/40'},
  {avatar: 'bg-amber-500/20 text-amber-400 border border-amber-500/40'},
  {avatar: 'bg-rose-500/20 text-rose-400 border border-rose-500/40'},
]

async function copyCode() {
  if (!props.code) return
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // 클립보드 권한 없을 시 무시
  }
}
</script>

<style scoped>
.phase-fade-enter-active,
.phase-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.phase-fade-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.phase-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
