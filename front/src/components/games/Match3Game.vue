<template>
  <GamePage description="인접한 타일을 교환해 같은 종류 3개 이상을 맞춰보세요" game-id="game-match3" title="매치3 퍼즐">
    <template #default="{ submitScore, restart }">
      <Match3Board :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import Match3Board from './Match3Board.vue'
</script>
