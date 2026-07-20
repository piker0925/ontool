<template>
  <GamePage description="방향키로 타일을 밀어 같은 숫자를 합쳐보세요" title="2048">
    <Game2048Board/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import Game2048Board from './Game2048Board.vue'
</script>
