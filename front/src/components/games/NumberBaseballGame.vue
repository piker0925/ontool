<template>
  <GamePage description="컴퓨터가 정한 숫자를 스트라이크·볼 힌트로 추리하세요" title="숫자야구">
    <NumberBaseballBoard/>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import NumberBaseballBoard from './NumberBaseballBoard.vue'
</script>
