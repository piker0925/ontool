<template>
  <GamePage description="컴퓨터를 상대로 틀고 놓는 삼목 게임 (X: 나, O: 컴퓨터)" title="틱택토">
    <TicTacToeBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import TicTacToeBoard from './TicTacToeBoard.vue'
</script>
