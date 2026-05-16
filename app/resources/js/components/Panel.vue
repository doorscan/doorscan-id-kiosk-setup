<script setup lang="ts">
const props = defineProps({
    awaiting: {
        type: Boolean,
        default: false,
    },
    awaitingText: {
        type: String,
        default: 'Awaiting Scan',
    },
});
</script>

<template>
    <div
        data-testid="panel"
        :data-awaiting="props.awaiting || undefined"
        class="relative rounded-md border-2 border-black transition-all duration-300 ease-in-out dark:border-white"
    >
        <div
            class="h-full"
            :class="props.awaiting && 'pointer-events-none invisible'"
        >
            <slot></slot>
        </div>

        <div
            v-if="props.awaiting"
            data-testid="panel-awaiting"
            class="absolute inset-0 flex items-center justify-center p-2"
        >
            <h2
                class="animate-pulse text-5xl font-semibold text-green-600 uppercase opacity-25"
            >
                {{ props.awaitingText }}
            </h2>
        </div>
    </div>
</template>
