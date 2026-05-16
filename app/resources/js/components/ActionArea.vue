<script lang="ts" setup>
import { ArrowPathIcon } from '@heroicons/vue/16/solid';
import { computed } from 'vue';

const emit = defineEmits<{
    manualEntry: [];
    scan: [];
}>();

const props = withDefaults(
    defineProps<{
        inProgress?: boolean;
    }>(),
    {
        inProgress: false,
    },
);

const scanButtonClass = computed(() => {
    return props.inProgress
        ? 'w-full bg-indigo-600 text-7xl hover:bg-indigo-600 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-500 dark:focus-visible:outline-indigo-500'
        : 'w-3/4 bg-green-600 text-7xl hover:bg-green-500 focus-visible:outline-green-600 dark:bg-green-500 dark:hover:bg-green-400 dark:focus-visible:outline-green-500';
});

const manualEntryButtonClass = computed(() => {
    return props.inProgress
        ? 'max-w-0 basis-0 translate-x-[calc(100%+1.5rem)] overflow-hidden px-0 opacity-0 pointer-events-none'
        : 'flex-1 translate-x-0 px-3.5 opacity-100';
});
</script>

<template>
    <div class="col-span-full flex overflow-hidden gap-6">
        <button
            :disabled="props.inProgress"
            :class="scanButtonClass"
            data-testid="scan-button"
            type="button"
            class="rounded-md px-3.5 py-2.5 font-bold text-white uppercase shadow-xs transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-100 dark:shadow-none"
            @click="emit('scan')"
        >
            <span
                v-if="props.inProgress"
                class="flex items-center justify-center gap-5"
            >
                <span data-testid="scan-spinner-left">
                    <ArrowPathIcon class="size-10 animate-spin" />
                </span>
                <span>Scan in progress</span>
                <span data-testid="scan-spinner-right">
                    <ArrowPathIcon class="size-10 animate-spin" />
                </span>
            </span>
            <template v-else>scan</template>
        </button>
        <button
            :class="manualEntryButtonClass"
            :disabled="props.inProgress"
            data-testid="manual-entry-button"
            type="button"
            class="rounded-md bg-amber-600 py-2.5 text-2xl leading-tight font-bold text-white uppercase shadow-xs transition-all duration-300 ease-out hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-100 dark:bg-amber-500 dark:shadow-none dark:hover:bg-amber-400 dark:focus-visible:outline-amber-500"
        >
            Manual <br />
            Entry
        </button>
    </div>
</template>
