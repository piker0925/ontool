<template>
  <div class="px-6 py-8 max-w-5xl mx-auto">
    <component :is="toolComponent" v-if="toolComponent"/>
  </div>
</template>

<script lang="ts" setup>
import {computed, type Component} from 'vue'
import UuidTool from './tools/UuidTool.vue'
import TimestampTool from './tools/TimestampTool.vue'
import ColorCodeTool from './tools/ColorCodeTool.vue'
import JsonFormatterTool from './tools/JsonFormatterTool.vue'
import JwtDecoderTool from './tools/JwtDecoderTool.vue'
import TextDiffTool from './tools/TextDiffTool.vue'
import RegexTesterTool from './tools/RegexTesterTool.vue'
import TotpTool from './tools/TotpTool.vue'
import SubnetCalcTool from './tools/SubnetCalcTool.vue'
import UrlParserTool from './tools/UrlParserTool.vue'
import CronTool from './tools/CronTool.vue'
import HmacTool from './tools/HmacTool.vue'
import AesTool from './tools/AesTool.vue'

const props = defineProps<{ moduleId: string }>()

const TOOL_COMPONENTS: Record<string, Component> = {
  'uuid': UuidTool,
  'timestamp': TimestampTool,
  'color-code': ColorCodeTool,
  'json-formatter': JsonFormatterTool,
  'jwt-decoder': JwtDecoderTool,
  'text-diff': TextDiffTool,
  'regex-tester': RegexTesterTool,
  'totp': TotpTool,
  'subnet-calc': SubnetCalcTool,
  'url-parser': UrlParserTool,
  'cron': CronTool,
  'hmac': HmacTool,
  'aes': AesTool,
}

const toolComponent = computed(() => TOOL_COMPONENTS[props.moduleId])
</script>
