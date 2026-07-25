<template>
  <!-- 라벨+값 형태 (예: "점수 12", "라운드 3") — 값에만 data-testid를 달아 기존 테스트가
       레이블 텍스트 없이 값만 읽던 관례(예: score 텍스트가 "0"이지 "점수 0"이 아님)를 유지한다. -->
  <p v-if="label !== undefined" class="font-mono text-sm text-muted-foreground">
    {{ label }} <span :data-testid="testid" class="text-foreground">{{ value }}</span>
  </p>

  <!-- 문장형 상태 표시 (예: "승리했습니다!", "당신 차례입니다") -->
  <p v-else :class="toneClass" :data-testid="testid" class="text-sm font-medium">
    {{ text }}
  </p>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

// 8개 게임에 흩어져 있던 두 가지 반복 패턴(라벨+값 카운터 / 톤 있는 상태 문장)을
// 하나의 컴포넌트로 묶어 시각 언어를 통일한다 (게임오버·승리 연출은 GameResultOverlay가 맡는다).
const props = withDefaults(defineProps<{
  testid?: string
  label?: string
  value?: string | number
  text?: string
  tone?: 'neutral' | 'win' | 'lose'
}>(), {
  tone: 'neutral',
})

const toneClass = computed(() => ({
  win: 'text-zone-accent',
  lose: 'text-destructive',
  neutral: 'text-muted-foreground',
}[props.tone]))
</script>
