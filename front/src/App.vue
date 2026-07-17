<template>
  <router-view v-if="isBareLayout"/>
  <DefaultLayout v-else/>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'

const route = useRoute()
const isBareLayout = computed(() => route.meta.layout === 'bare')
</script>
