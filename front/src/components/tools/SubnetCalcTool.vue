<template>
  <div class="flex flex-col gap-4 max-w-lg mx-auto w-full">
    <div class="flex flex-col gap-1.5">
      <label class="text-[11px] font-medium text-muted-foreground">CIDR</label>
      <input v-model="cidrInput"
             class="rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-[13px] text-foreground outline-none focus:border-ring"
             placeholder="192.168.1.0/24"
             spellcheck="false"
             type="text"/>
    </div>

    <div v-if="result" class="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div v-for="row in resultRows" :key="row.label" class="flex items-center justify-between gap-3">
        <span class="text-[11px] text-muted-foreground shrink-0">{{ row.label }}</span>
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-mono text-[13px] text-foreground truncate">{{ row.value }}</span>
          <button class="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground shrink-0"
                  @click="copyText(row.value)">
            <Copy class="size-3"/>
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-[11px] text-destructive/70">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {Copy} from 'lucide-vue-next'
import {calculateSubnet, type SubnetResult} from '../../utils/subnetCalc'

const cidrInput = ref('192.168.1.0/24')

const result = computed<SubnetResult | null>(() => {
  if (!cidrInput.value.trim()) return null
  try {
    return calculateSubnet(cidrInput.value)
  } catch {
    return null
  }
})

const error = computed(() => {
  if (!cidrInput.value.trim()) return ''
  try {
    calculateSubnet(cidrInput.value)
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : '올바른 CIDR을 입력하세요.'
  }
})

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  return [
    {label: '네트워크 주소', value: r.network},
    {label: '브로드캐스트', value: r.broadcast},
    {label: '서브넷 마스크', value: r.mask},
    {label: '호스트 범위', value: r.hostRange},
    {label: '사용 가능 호스트', value: r.usableHosts.toLocaleString()},
    {label: '분류', value: r.classification},
  ]
})

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}
</script>
