<script lang="ts" setup>
import {SearchIcon} from '@lucide/vue';

import type {ListboxFilterProps} from "reka-ui"
import {ListboxFilter, useForwardProps} from "reka-ui"
import type {HTMLAttributes} from "vue"
import {reactiveOmit} from "@vueuse/core"
import {cn} from "@/lib/utils"
import {InputGroup, InputGroupAddon} from '@/components/ui/input-group'
import {useCommand} from "."

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<ListboxFilterProps & {
  class?: HTMLAttributes["class"]
}>()

const delegatedProps = reactiveOmit(props, "class", "modelValue")

const forwardedProps = useForwardProps(delegatedProps)

const {filterState} = useCommand()
</script>

<template>
  <div
      class="p-1 pb-0"
      data-slot="command-input-wrapper"
  >
    <InputGroup class="bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!">
      <ListboxFilter
          v-model="filterState.search"
          :class="cn('w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50', props.class)"
          auto-focus
          data-slot="command-input"
          v-bind="{ ...forwardedProps, ...$attrs }"
      />
      <InputGroupAddon>
        <SearchIcon class="size-4 shrink-0 opacity-50"/>
      </InputGroupAddon>
    </InputGroup>
  </div>
</template>
