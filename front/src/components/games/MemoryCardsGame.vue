<template>
  <GamePage description="카드 두 장을 뒤집어 짝을 맞추는 기억력 게임" title="카드 짝맞추기">
    <MemoryCardsBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import MemoryCardsBoard from './MemoryCardsBoard.vue'
</script>
