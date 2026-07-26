<template>
  <GamePage description="색상 순서를 기억해 그대로 따라 클릭하세요" game-id="game-simon" title="사이먼">
    <template #default="{ submitScore, restart, onGameEnd }">
      <SimonBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import SimonBoard from './SimonBoard.vue'
</script>
