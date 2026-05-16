<script setup lang="ts">
import { computed } from 'vue';
import Panel from '@/components/Panel.vue';
import CheckItem from '@/pages/CheckItem.vue';
import type {
    DocumentScanFieldKey,
    DocumentScanFieldStatus,
    DocumentScanState,
} from '@/types/scan';

type CheckItemStatus = 'complete' | 'failed' | 'in-progress';

const props = defineProps<{
    awaiting: boolean;
    state: DocumentScanState;
}>();

const scanStepDefinitions: Array<{
    field: DocumentScanFieldKey;
    label: string;
}> = [
    {
        field: 'first_name',
        label: 'First name',
    },
    {
        field: 'last_name',
        label: 'Last name',
    },
    {
        field: 'dob',
        label: 'Date of birth',
    },
    {
        field: 'address',
        label: 'Address',
    },
];

const toCheckItemStatus = (
    status: DocumentScanFieldStatus,
): CheckItemStatus => {
    if (status === 'completed') {
        return 'complete';
    }

    return status;
};

const overallStatusLabel = computed(() => {
    if (props.state.status === 'succeeded') {
        return 'Succeeded';
    }

    if (props.state.status === 'failed') {
        return 'Failed';
    }

    return 'Scanning';
});

const scanSteps = computed(() => {
    return scanStepDefinitions.map(({ field, label }) => {
        const scanField = props.state.result[field];

        return {
            label,
            status: toCheckItemStatus(scanField.status),
        };
    });
});
</script>

<template>
    <Panel class="aspect-video p-2" :awaiting="awaiting">
        <div class="flex h-full flex-col gap-4">
            <div
                class="flex items-center justify-between border-b border-zinc-200 px-3 pb-3 text-sm font-semibold tracking-[0.24em] text-zinc-500 uppercase"
            >
                <span>Document Data</span>
                <span data-testid="scan-data-status">{{
                    overallStatusLabel
                }}</span>
            </div>
            <ul
                class="flex h-full flex-col gap-2 px-3 pb-3 text-lg font-semibold"
            >
                <CheckItem
                    v-for="step in scanSteps"
                    :key="step.label"
                    :status="step.status"
                    :data-testid="`scan-data-${step.label}`"
                >
                    <span>{{ step.label }}</span>
                </CheckItem>
            </ul>
        </div>
    </Panel>
</template>
