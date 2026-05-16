<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@/lib/utils';
import { stateString, usePinEntryContext } from './context';
import type {
    PinEntryDigitState,
    PinEntrySlotProps,
    PinEntrySlotSlotProps,
} from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntrySlotProps>(), {
    as: 'div',
});

const attrs = useAttrs();
const context = usePinEntryContext('PinEntrySlot');

const digit = computed<PinEntryDigitState>(() => {
    const fallback: PinEntryDigitState = {
        index: props.index,
        value: '',
        displayValue: '',
        empty: true,
        filled: false,
        masked: context.masked.value,
    };

    return context.digits.value[props.index] ?? fallback;
});

const slotProps = computed<PinEntrySlotSlotProps>(() => ({
    ...digit.value,
    disabled: context.disabled.value,
    index: props.index,
    isComplete: context.isComplete.value,
}));

const state = computed(() =>
    stateString({
        complete: context.isComplete.value,
        disabled: context.disabled.value,
        empty: digit.value.empty,
        filled: digit.value.filled,
        masked: digit.value.masked,
    }),
);
</script>

<template>
    <component
        :is="props.as"
        v-bind="attrs"
        data-slot="pin-entry-slot"
        :data-complete="context.isComplete.value || undefined"
        :data-disabled="context.disabled.value || undefined"
        :data-empty="digit.empty || undefined"
        :data-filled="digit.filled || undefined"
        :data-headlessui-state="state"
        :data-index="props.index"
        :data-masked="digit.masked || undefined"
        :class="cn(props.class)"
    >
        <slot v-bind="slotProps">
            {{ digit.displayValue }}
        </slot>
    </component>
</template>
