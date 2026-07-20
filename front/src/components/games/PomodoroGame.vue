<template>
  <GamePage description="작업/휴식 사이클을 반복하는 뽀모도로 타이머" title="뽀모도로">
    <PomodoroBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import PomodoroBoard from './PomodoroBoard.vue'
</script>
