<template>
  <GamePage description="정해진 글자 수의 한국어 단어를 몇 번의 시도 안에 맞혀보세요" title="단어 맞추기">
    <template #default="{ submitScore }">
      <WordGuessBoard :submit-score="submitScore"/>
    </template>
  </GamePage>
</template>

<script lang="ts" setup>
import GamePage from '../GamePage.vue'
import WordGuessBoard from './WordGuessBoard.vue'
</script>
