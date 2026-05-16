<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@/lib/utils';
import { stateString, usePinEntryContext } from './context';
import type { PinEntryKeyProps, PinEntryKeySlotProps } from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntryKeyProps>(), {
    as: 'button',
    disabled: false,
});

const attrs = useAttrs();
const context = usePinEntryContext('PinEntryKey');

const isDisabled = computed(
    () => context.disabled.value || props.disabled || !/^\d$/.test(props.digit),
);

const state = computed(() =>
    stateString({
        disabled: isDisabled.value,
    }),
);

const slotProps = computed<PinEntryKeySlotProps>(() => ({
    digit: props.digit,
    disabled: isDisabled.value,
    press,
}));

const role = computed(() => (props.as === 'button' ? undefined : 'button'));

const tabIndex = computed(() =>
    props.as === 'button' ? undefined : isDisabled.value ? -1 : 0,
);

const type = computed(() =>
    props.as === 'button' && attrs.type === undefined ? 'button' : undefined,
);

function press(): void {
    if (isDisabled.value) {
        return;
    }

    context.appendDigit(props.digit);
}

function handleKeydown(event: KeyboardEvent): void {
    if (props.as === 'button') {
        return;
    }

    if (event.key !== ' ' && event.key !== 'Enter') {
        return;
    }

    event.preventDefault();
    press();
}
</script>

<template>
    <component
        :is="props.as"
        v-bind="attrs"
        :type="type"
        data-slot="pin-entry-key"
        :data-digit="props.digit"
        :data-disabled="isDisabled || undefined"
        :data-headlessui-state="state"
        :aria-disabled="isDisabled || undefined"
        :class="cn(props.class)"
        :role="role"
        :tabindex="tabIndex"
        @click="press"
        @keydown="handleKeydown"
    >
        <slot v-bind="slotProps">
            {{ props.digit }}
        </slot>
    </component>
</template>
