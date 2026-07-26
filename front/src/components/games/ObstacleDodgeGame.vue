<template>
  <GamePage description="탭이나 스페이스바로 점프해서 장애물을 피해보세요" game-id="game-obstacle-dodge" title="장애물 피하기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <ObstacleDodgeBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import ObstacleDodgeBoard from './ObstacleDodgeBoard.vue'
</script>
