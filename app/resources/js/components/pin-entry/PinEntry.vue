<script setup lang="ts">
import { BackspaceIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { cn } from '@/lib/utils';
import PinEntryAction from './PinEntryAction.vue';
import PinEntryDisplay from './PinEntryDisplay.vue';
import PinEntryKey from './PinEntryKey.vue';
import PinEntryPad from './PinEntryPad.vue';
import PinEntryRoot from './PinEntryRoot.vue';
import PinEntrySlot from './PinEntrySlot.vue';
import type { PinEntryProps } from './types';

defineOptions({
    inheritAttrs: false,
});

const props = withDefaults(defineProps<PinEntryProps>(), {
    as: 'div',
    defaultValue: '',
    disabled: false,
    length: 6,
    masked: true,
    modelValue: undefined,
});

const emit = defineEmits<{
    (e: 'backspace'): void;
    (e: 'back'): void;
    (e: 'clear'): void;
    (e: 'complete', value: string): void;
    (e: 'reset'): void;
    (e: 'update:modelValue', value: string): void;
}>();

const digitButtonClasses =
    'flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-background text-lg font-medium text-foreground shadow-xs transition-colors duration-150 select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none active:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-40 dark:bg-input/30 dark:hover:bg-accent/60';

const actionButtonClasses =
    'flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground shadow-xs transition-colors duration-150 select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none active:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-40 dark:bg-muted/40 dark:hover:bg-accent/60';
</script>

<template>
    <PinEntryRoot
        v-bind="$attrs"
        :as="props.as"
        :class="
            cn(
                'inline-flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors sm:p-7',
                'focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none',
                props.disabled && 'cursor-not-allowed opacity-65',
                props.class,
            )
        "
        :default-value="props.defaultValue"
        :disabled="props.disabled"
        :length="props.length"
        :masked="props.masked"
        :model-value="props.modelValue"
        @back="
            emit('back');
            emit('backspace');
        "
        @complete="emit('complete', $event)"
        @reset="
            emit('reset');
            emit('clear');
        "
        @update:model-value="emit('update:modelValue', $event)"
    >
        <PinEntryDisplay
            :class="
                cn(
                    'flex flex-col items-center gap-4 text-center',
                    props.displayClass,
                )
            "
        >
            <template #default="{ digits, enteredLength, length }">
                <p class="sr-only">
                    {{ enteredLength }} of {{ length }} digits entered
                </p>

                <div class="flex items-center justify-center gap-3">
                    <PinEntrySlot
                        v-for="digit in digits"
                        :key="digit.index"
                        :index="digit.index"
                        :class="
                            cn(
                                'flex size-10 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium shadow-xs transition-colors sm:size-11',
                                'data-[filled]:border-ring/30 data-[filled]:bg-accent/40 data-[filled]:text-foreground dark:data-[filled]:bg-accent/30',
                                'data-[empty]:text-transparent',
                                'data-[disabled]:opacity-70',
                                props.slotClass,
                            )
                        "
                    >
                        <template #default="{ filled, masked, value }">
                            <span
                                v-if="filled && masked"
                                data-slot="pin-entry-slot-dot"
                                class="size-2 rounded-full bg-foreground"
                            />

                            <span v-else-if="filled" class="tracking-[0.08em]">
                                {{ value }}
                            </span>
                        </template>
                    </PinEntrySlot>
                </div>
            </template>
        </PinEntryDisplay>

        <p
            v-if="props.error"
            data-slot="pin-entry-error"
            :class="
                cn(
                    'text-center text-sm font-semibold text-red-600 dark:text-red-500',
                    props.errorClass,
                )
            "
        >
            {{ props.error }}
        </p>

        <PinEntryPad
            :class="
                cn(
                    'grid w-full max-w-[16rem] grid-cols-3 gap-3',
                    props.padClass,
                )
            "
        >
            <template #default="{ keyDigits }">
                <PinEntryKey
                    v-for="digit in keyDigits.slice(0, 9)"
                    :key="digit"
                    :digit="digit"
                    :class="cn(digitButtonClasses, props.keyClass)"
                >
                    <template #default="{ digit }">
                        {{ digit }}
                    </template>
                </PinEntryKey>

                <PinEntryAction
                    action="clear"
                    :class="cn(actionButtonClasses, props.actionClass)"
                    aria-label="Clear PIN"
                >
                    <template #default>
                        <span class="sr-only">Clear PIN</span>
                        <XMarkIcon class="size-5" />
                    </template>
                </PinEntryAction>

                <PinEntryKey
                    digit="0"
                    :class="cn(digitButtonClasses, props.keyClass)"
                >
                    <template #default="{ digit }">
                        {{ digit }}
                    </template>
                </PinEntryKey>

                <PinEntryAction
                    action="back"
                    :class="cn(actionButtonClasses, props.actionClass)"
                    aria-label="Delete digit"
                >
                    <template #default>
                        <span class="sr-only">Delete digit</span>
                        <BackspaceIcon class="size-5" />
                    </template>
                </PinEntryAction>
            </template>
        </PinEntryPad>
    </PinEntryRoot>
</template>
