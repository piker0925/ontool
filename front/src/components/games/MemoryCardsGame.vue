<template>
  <GamePage description="카드 두 장을 뒤집어 짝을 맞추는 기억력 퍼즐 게임!" game-id="game-memory-cards" title="카드 짝맞추기">
    <template #default="{ submitScore, restart, onGameEnd }">
      <MemoryCardsBoard :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import MemoryCardsBoard from './MemoryCardsBoard.vue'
</script>
