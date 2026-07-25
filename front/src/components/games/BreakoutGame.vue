<template>
  <GamePage description="패들로 공을 튕겨 위쪽 벽돌을 모두 깨보세요" game-id="game-breakout" title="벽돌깨기">
    <template #default="{ submitScore, restart }">
      <BreakoutBoard :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import BreakoutBoard from './BreakoutBoard.vue'
</script>
