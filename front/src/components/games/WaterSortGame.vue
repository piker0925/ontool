<template>
  <GamePage description="시험관에 섞인 색깔을 같은 색끼리 모아 분리해보세요" game-id="game-water-sort" title="워터소트 퍼즐">
    <template #default="{ submitScore }">
      <WaterSortBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import WaterSortBoard from './WaterSortBoard.vue'
</script>
