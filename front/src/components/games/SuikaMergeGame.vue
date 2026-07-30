<template>
  <GamePage description="같은 과일끼리 합쳐서 더 큰 과일로 키우는 힐링 물리 퍼즐! 최종 목표는 왕수박 합성!" game-id="game-suika-merge" title="수박게임">
    <template #default="{ submitScore, restart, onGameEnd }">
      <SuikaMergeBoard :on-game-end="onGameEnd" :restart="restart" :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import SuikaMergeBoard from './SuikaMergeBoard.vue'
</script>
