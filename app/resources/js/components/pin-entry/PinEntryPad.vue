<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@/lib/utils';
import { stateString, usePinEntryContext } from './context';
import type { PinEntryPadProps, PinEntryPadSlotProps } from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntryPadProps>(), {
    as: 'div',
});

const attrs = useAttrs();
const context = usePinEntryContext('PinEntryPad');

const slotProps = computed<PinEntryPadSlotProps>(() => ({
    appendDigit: context.appendDigit,
    backspace: context.backspace,
    clear: context.clear,
    digits: context.digits.value,
    disabled: context.disabled.value,
    isComplete: context.isComplete.value,
    keyDigits: [...context.keyDigits],
}));

const state = computed(() =>
    stateString({
        complete: context.isComplete.value,
        disabled: context.disabled.value,
    }),
);
</script>

<template>
    <component
        :is="props.as"
        v-bind="attrs"
        data-slot="pin-entry-pad"
        :data-complete="context.isComplete.value || undefined"
        :data-disabled="context.disabled.value || undefined"
        :data-headlessui-state="state"
        :class="cn(props.class)"
    >
        <slot v-bind="slotProps" />
    </component>
</template>
