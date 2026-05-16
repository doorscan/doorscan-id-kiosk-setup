<script setup lang="ts">
import { computed } from 'vue';
import Panel from '@/components/Panel.vue';
import type { DocumentScanState } from '@/types/scan';

const props = defineProps<{
    awaiting: boolean;
    state: DocumentScanState;
}>();

const extractedFaceImage = computed(() => {
    const faceImage = props.state.result.extracted_face_image;

    if (faceImage.status !== 'completed' || faceImage.value === null) {
        return null;
    }

    return faceImage.value;
});

const overallFailureMessage = computed(() => {
    if (props.state.status !== 'failed') {
        return null;
    }

    return props.state.message;
});

const scanImage = computed(() => {
    const documentImage = props.state.result.scan_image;

    if (documentImage.status !== 'completed' || documentImage.value === null) {
        return null;
    }

    return documentImage.value;
});
</script>

<template>
    <Panel :awaiting="props.awaiting" class="relative aspect-video">
        <div class="absolute inset-0 overflow-hidden">
            <img
                v-if="scanImage"
                :src="scanImage"
                alt="Scanned document"
                class="absolute inset-0 h-full w-full object-contain blur-xs"
                data-testid="scan-document-image"
            />
            <div
                v-else
                class="flex h-full items-center justify-center bg-zinc-100/50 px-4 text-center text-sm font-semibold tracking-[0.24em] text-zinc-500 uppercase"
                data-testid="scan-document-image-placeholder"
            >
                Document image pending
            </div>
        </div>

        <div
            v-if="extractedFaceImage"
            class="absolute inset-0 z-10 flex items-center justify-center"
        >
            <img
                :src="extractedFaceImage"
                alt="Extracted face"
                class="h-full w-full object-contain"
                data-testid="scan-face-image"
            />
        </div>

        <div
            v-if="overallFailureMessage"
            class="absolute inset-x-3 bottom-3 z-20 rounded-md bg-red-600/90 px-4 py-3 text-sm font-semibold text-white shadow-lg"
            data-testid="scan-failure-message"
        >
            {{ overallFailureMessage }}
        </div>
    </Panel>
</template>
