<template>
  <GamePage description="컴퓨터가 정한 숫자를 스트라이크·볼 힌트로 추리하세요" game-id="game-baseball" title="숫자야구">
    <template #default="{ submitScore }">
      <NumberBaseballBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import NumberBaseballBoard from './NumberBaseballBoard.vue'
</script>
