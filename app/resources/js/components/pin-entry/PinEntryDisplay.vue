<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@/lib/utils';
import { stateString, usePinEntryContext } from './context';
import type { PinEntryDisplayProps, PinEntryDisplaySlotProps } from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntryDisplayProps>(), {
    as: 'div',
});

const attrs = useAttrs();
const context = usePinEntryContext('PinEntryDisplay');

const slotProps = computed<PinEntryDisplaySlotProps>(() => ({
    digits: context.digits.value,
    disabled: context.disabled.value,
    enteredLength: context.value.value.length,
    isComplete: context.isComplete.value,
    isEmpty: context.isEmpty.value,
    length: context.length.value,
    masked: context.masked.value,
}));

const state = computed(() =>
    stateString({
        complete: context.isComplete.value,
        disabled: context.disabled.value,
        empty: context.isEmpty.value,
    }),
);
</script>

<template>
    <component
        :is="props.as"
        v-bind="attrs"
        data-slot="pin-entry-display"
        :data-complete="context.isComplete.value || undefined"
        :data-disabled="context.disabled.value || undefined"
        :data-empty="context.isEmpty.value || undefined"
        :data-headlessui-state="state"
        :class="cn(props.class)"
    >
        <slot v-bind="slotProps" />
    </component>
</template>
