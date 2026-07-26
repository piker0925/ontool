<template>
  <GamePage description="빈칸과 인접한 타일을 눌러 1부터 15까지 순서대로 맞추세요" game-id="game-sliding-puzzle" title="슬라이딩 퍼즐">
    <template #default="{ submitScore, restart, onGameEnd }">
      <SlidingPuzzleBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import SlidingPuzzleBoard from './SlidingPuzzleBoard.vue'
</script>
