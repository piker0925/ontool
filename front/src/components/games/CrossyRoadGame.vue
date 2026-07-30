<template>
  <GamePage description="도로와 철길을 건너며 최대한 멀리 전진하는 길건너 친구들 게임!" game-id="game-crossy-road" title="길건너 친구들">
    <template #default="{ submitScore, restart, onGameEnd }">
      <CrossyRoadBoard :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import CrossyRoadBoard from './CrossyRoadBoard.vue'
</script>
