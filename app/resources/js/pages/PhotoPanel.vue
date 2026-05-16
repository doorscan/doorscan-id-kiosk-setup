<script setup lang="ts">
import { computed } from 'vue';
import Panel from '@/components/Panel.vue';

const emit = defineEmits<{
    retake: [];
}>();

const props = withDefaults(
    defineProps<{
        hasScan?: boolean;
        photoDataUrl?: string | null;
        scanInProgress?: boolean;
    }>(),
    {
        hasScan: false,
        photoDataUrl: null,
        scanInProgress: false,
    },
);

const showPhoto = computed(() => {
    return props.hasScan && props.photoDataUrl !== null;
});

const capturedPhotoSrc = computed(() => {
    return props.photoDataUrl ?? undefined;
});

const canRetakePhoto = computed(() => {
    return (
        props.hasScan &&
        props.scanInProgress &&
        props.photoDataUrl !== null
    );
});

const handleRetake = (): void => {
    if (!canRetakePhoto.value) {
        return;
    }

    emit('retake');
};
</script>

<template>
    <Panel
        class="aspect-video p-2"
        :awaiting="!props.hasScan"
        awaiting-text="Ready for Photo"
    >
        <button
            v-if="showPhoto"
            :disabled="!canRetakePhoto"
            class="relative block h-full w-full overflow-hidden rounded-md disabled:cursor-default"
            data-testid="photo-panel-button"
            type="button"
            @click="handleRetake"
        >
            <img
                :src="capturedPhotoSrc"
                alt="Captured webcam frame"
                class="h-full w-full object-cover"
                data-testid="captured-photo"
            />
        </button>
        <div
            v-else
            class="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-300/70 bg-zinc-100/40 text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500"
            data-testid="photo-placeholder"
        >
            Photo
        </div>
    </Panel>
</template>
