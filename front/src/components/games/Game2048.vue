<template>
  <GamePage description="방향키로 타일을 밀어 같은 숫자를 합쳐보세요" game-id="game-2048" title="2048">
    <template #default="{ submitScore, restart, onGameEnd }">
      <Game2048Board :restart="restart" :submit-score="submitScore" :on-game-end="onGameEnd"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import Game2048Board from './Game2048Board.vue'
</script>
