<template>
  <GamePage description="신호가 뜨면 최대한 빨리 클릭하세요" game-id="game-reaction-time" title="반응속도 테스트">
    <template #default="{ submitScore }">
      <ReactionTimeBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import ReactionTimeBoard from './ReactionTimeBoard.vue'
</script>
