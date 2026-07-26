<template>
  <GamePage description="지뢰가 아닌 칸을 모두 열면 승리 (우클릭: 깃발)" game-id="game-minesweeper" title="지뢰찾기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <MinesweeperBoard :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'
</script>
