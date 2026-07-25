<template>
  <GamePage description="방향키 또는 스와이프로 뱀을 조종해 먹이를 먹으세요" game-id="game-snake" title="스네이크">
    <template #default="{ submitScore }">
      <SnakeBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import SnakeBoard from './SnakeBoard.vue'
</script>
