<script setup lang="ts">
import { computed, provide, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '@/lib/utils';
import { pinEntryContextKey, pinEntryKeyDigits, stateString } from './context';
import type {
    PinEntryDigitState,
    PinEntryRootProps,
    PinEntryRootSlotProps,
} from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntryRootProps>(), {
    as: 'div',
    defaultValue: '',
    disabled: false,
    length: 6,
    masked: true,
    modelValue: undefined,
});

const emit = defineEmits<{
    (e: 'back'): void;
    (e: 'complete', value: string): void;
    (e: 'reset'): void;
    (e: 'update:modelValue', value: string): void;
}>();

const attrs = useAttrs();
const rootRef = useTemplateRef<HTMLElement>('rootRef');

const normalizedLength = computed(() => Math.max(0, Math.trunc(props.length)));

function sanitizeValue(nextValue: string): string {
    return String(nextValue ?? '')
        .replace(/\D/g, '')
        .slice(0, normalizedLength.value);
}

const value = ref(
    sanitizeValue(props.modelValue ?? props.defaultValue ?? ''),
);

const sanitizedValue = computed(() =>
    sanitizeValue(value.value),
);

const digits = computed<PinEntryDigitState[]>(() =>
    Array.from({ length: normalizedLength.value }, (_, index) => {
        const digit = sanitizedValue.value[index] ?? '';
        const filled = digit !== '';

        return {
            index,
            value: digit,
            displayValue: filled && props.masked ? '\u2022' : digit,
            empty: !filled,
            filled,
            masked: props.masked,
        };
    }),
);

const isComplete = computed(
    () =>
        normalizedLength.value > 0 &&
        sanitizedValue.value.length === normalizedLength.value,
);

const isEmpty = computed(() => sanitizedValue.value.length === 0);

const slotProps = computed<PinEntryRootSlotProps>(() => ({
    appendDigit,
    backspace,
    clear,
    digits: digits.value,
    disabled: props.disabled,
    isComplete: isComplete.value,
    isEmpty: isEmpty.value,
    length: normalizedLength.value,
    masked: props.masked,
    setValue,
    value: sanitizedValue.value,
}));

watch(
    [() => props.modelValue, normalizedLength],
    () => {
        if (props.modelValue !== undefined) {
            const nextValue = sanitizeValue(props.modelValue);

            if (value.value !== nextValue) {
                value.value = nextValue;
            }

            return;
        }

        if (value.value !== sanitizedValue.value) {
            value.value = sanitizedValue.value;
        }
    },
    { immediate: true },
);

watch(isComplete, (complete, previous) => {
    if (complete && !previous) {
        emit('complete', sanitizedValue.value);
    }
});

function setValue(nextValue: string): void {
    const sanitizedNextValue = sanitizeValue(nextValue);

    if (value.value === sanitizedNextValue) {
        return;
    }

    value.value = sanitizedNextValue;
    emit('update:modelValue', sanitizedNextValue);
}

function appendDigit(digit: string): void {
    if (props.disabled || !/^\d$/.test(digit)) {
        return;
    }

    if (sanitizedValue.value.length >= normalizedLength.value) {
        return;
    }

    setValue(`${sanitizedValue.value}${digit}`);
}

function clear(): void {
    if (props.disabled) {
        return;
    }

    setValue('');
    emit('reset');
}

function backspace(): void {
    if (props.disabled) {
        return;
    }

    setValue(sanitizedValue.value.slice(0, -1));
    emit('back');
}

function handleKeydown(event: KeyboardEvent): void {
    if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    if (/^\d$/.test(event.key)) {
        event.preventDefault();
        appendDigit(event.key);

        return;
    }

    if (event.key === 'Backspace') {
        event.preventDefault();
        backspace();
    }
}

const rootState = computed(() =>
    stateString({
        complete: isComplete.value,
        disabled: props.disabled,
        empty: isEmpty.value,
    }),
);

const rootTabIndex = computed(() => {
    const userTabIndex = attrs.tabindex;

    if (userTabIndex !== undefined) {
        return userTabIndex;
    }

    return props.disabled ? -1 : 0;
});

provide(pinEntryContextKey, {
    appendDigit,
    backspace,
    clear,
    digits,
    disabled: computed(() => props.disabled),
    isComplete,
    isEmpty,
    keyDigits: pinEntryKeyDigits,
    length: normalizedLength,
    masked: computed(() => props.masked),
    setValue,
    slotProps,
    value: computed({
        get: () => sanitizedValue.value,
        set: (nextValue: string) => {
            setValue(nextValue);
        },
    }),
});

defineExpose({
    focus: () => rootRef.value?.focus(),
});
</script>

<template>
    <component
        :is="props.as"
        ref="rootRef"
        v-bind="attrs"
        data-slot="pin-entry-root"
        :data-complete="isComplete || undefined"
        :data-disabled="props.disabled || undefined"
        :data-empty="isEmpty || undefined"
        :data-headlessui-state="rootState"
        :aria-disabled="props.disabled || undefined"
        :class="cn(props.class)"
        :tabindex="rootTabIndex"
        @keydown="handleKeydown"
    >
        <slot v-bind="slotProps" />
    </component>
</template>
