<template>
  <GamePage description="지뢰가 아닌 칸을 모두 열면 승리 (우클릭: 깃발)" title="지뢰찾기">
    <MinesweeperBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import MinesweeperBoard from './MinesweeperBoard.vue'
</script>
