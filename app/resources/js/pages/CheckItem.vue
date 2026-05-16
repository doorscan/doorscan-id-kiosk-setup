<script setup lang="ts">
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
} from '@heroicons/vue/16/solid';

type CheckItemStatus = 'complete' | 'failed' | 'in-progress';

defineProps<{
    status: CheckItemStatus;
}>();
</script>

<template>
    <li class="flex items-center gap-x-4">
        <CheckCircleIcon v-if="status == 'complete'" class="size-6 text-green-500 dark:text-green-400" />
        <XCircleIcon v-else-if="status == 'failed'" class="size-6 text-red-500 dark:text-red-400" />
        <ArrowPathIcon v-else class="size-6 text-teal-500 dark:text-teal-400 animate-spin" />
        <slot></slot>
    </li>
</template>
