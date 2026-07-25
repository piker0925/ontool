<template>
  <GamePage description="컴퓨터를 상대로 틀고 놓는 삼목 게임 (X: 나, O: 컴퓨터)" game-id="game-tictactoe" title="틱택토">
    <template #default="{ submitScore }">
      <TicTacToeBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import TicTacToeBoard from './TicTacToeBoard.vue'
</script>
