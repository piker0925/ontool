<template>
  <GamePage description="신호가 뜨면 최대한 빨리 클릭하세요" title="반응속도 테스트">
    <ReactionTimeBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import ReactionTimeBoard from './ReactionTimeBoard.vue'
</script>
