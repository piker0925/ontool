<template>
  <GamePage description="색상 순서를 기억해 그대로 따라 클릭하세요" game-id="game-simon" title="사이먼">
    <template #default="{ submitScore, restart }">
      <SimonBoard :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import SimonBoard from './SimonBoard.vue'
</script>
