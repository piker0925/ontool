<template>
  <GamePage description="지뢰가 아닌 칸을 모두 열면 승리 (우클릭: 깃발)" game-id="game-minesweeper" title="지뢰찾기">
    <template #default="{ submitScore }">
      <MinesweeperBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'
</script>
