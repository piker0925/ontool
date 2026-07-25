<template>
  <GamePage description="인접한 타일을 교환해 같은 종류 3개 이상을 맞춰보세요" title="매치3 퍼즐">
    <template #default>
      <Match3Board/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import Match3Board from './Match3Board.vue'
</script>
