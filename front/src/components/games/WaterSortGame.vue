<template>
  <GamePage description="시험관에 섞인 색깔을 같은 색끼리 모아 분리해보세요" game-id="game-water-sort" title="컬러 물약 정렬">
    <template #default="{ submitScore, restart, onGameEnd }">
      <WaterSortBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import WaterSortBoard from './WaterSortBoard.vue'
</script>
