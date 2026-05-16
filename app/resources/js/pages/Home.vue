<script setup lang="ts">
import { Head, useHttp } from '@inertiajs/vue3';
import { computed, shallowRef, watch } from 'vue';
import RecordVisitController from '@/actions/App/Http/Controllers/RecordVisitController';
import ActionArea from '@/components/ActionArea.vue';
import ScanDataPanel from '@/components/ScanDataPanel.vue';
import ScanLayout from '@/layouts/ScanLayout.vue';
import type { AdvertDisplay } from '@/lib/adverts';
import {
    createMockDocumentScannerAdapter,
    useDocumentScan,
} from '@/lib/document-scan';
import LiveVideoPanel from '@/pages/LiveVideoPanel.vue';
import PhotoPanel from '@/pages/PhotoPanel.vue';
import ScanImagePanel from '@/pages/ScanImagePanel.vue';
import type { DocumentScanState } from '@/types/scan';
import {
    type VisitPayload,
    toVisitScanPayload,
} from '@/types/visit';

withDefaults(
    defineProps<{
        initialAdvert?: AdvertDisplay | null;
    }>(),
    {
        initialAdvert: null,
    },
);

const createEmptyVisitPayload = (): VisitPayload => ({
    photo: '',
    scan: {
        data: {
            address: null,
            dob: null,
            first_name: null,
            last_name: null,
            ocr_data_raw: null,
            type: null,
        },
        finished_at: null,
        images: {
            extracted_face_image: null,
            scan_image: null,
        },
        message: null,
        started_at: null,
        status: 'failed',
    },
    visit_at: '',
});

const scanStartDatetime = shallowRef<Date | null>(null);
const photoCaptureInProgress = shallowRef(false);
const hasScan = shallowRef(false);
const captureRequestId = shallowRef(0);
const capturedPhoto = shallowRef<string | null>(null);
const visitRequest = useHttp<VisitPayload>(createEmptyVisitPayload());
const {
    isInProgress: isDocumentScanInProgress,
    reset: resetDocumentScan,
    startScan: startDocumentScan,
    state: documentScanState,
} = useDocumentScan(createMockDocumentScannerAdapter());
let resolvePendingCapture: ((photoDataUrl: string) => void) | null = null;
let rejectPendingCapture: ((error: Error) => void) | null = null;
let resolvePendingDocumentScan:
    | ((state: DocumentScanState) => void)
    | null = null;
let rejectPendingDocumentScan: ((error: Error) => void) | null = null;

const isAnyScanInProgress = computed(() => {
    return photoCaptureInProgress.value || isDocumentScanInProgress.value;
});

const isDocumentScanAwaiting = computed(() => {
    return documentScanState.value.status === 'ready';
});

const clearPendingCapture = (): void => {
    resolvePendingCapture = null;
    rejectPendingCapture = null;
};

const clearPendingDocumentScan = (): void => {
    resolvePendingDocumentScan = null;
    rejectPendingDocumentScan = null;
};

watch(
    () => documentScanState.value.status,
    (status) => {
        if (status !== 'failed' && status !== 'succeeded') {
            return;
        }

        resolvePendingDocumentScan?.(documentScanState.value);
        clearPendingDocumentScan();
    },
);

const resetScan = (): void => {
    rejectPendingCapture?.(new Error('Photo capture reset.'));
    rejectPendingDocumentScan?.(new Error('Document scan reset.'));
    clearPendingCapture();
    clearPendingDocumentScan();
    hasScan.value = false;
    photoCaptureInProgress.value = false;
    scanStartDatetime.value = null;
    capturedPhoto.value = null;
    captureRequestId.value = 0;
    resetDocumentScan();
};

const handlePhotoCaptured = (photoDataUrl: string): void => {
    capturedPhoto.value = photoDataUrl;

    resolvePendingCapture?.(photoDataUrl);
    clearPendingCapture();
};

const queuePhotoCapture = (): void => {
    captureRequestId.value += 1;
};

const requestPhotoCapture = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        resolvePendingCapture = resolve;
        rejectPendingCapture = reject;
        queuePhotoCapture();
    });
};

const waitForDocumentScanCompletion = (): Promise<DocumentScanState> => {
    if (
        documentScanState.value.status === 'failed' ||
        documentScanState.value.status === 'succeeded'
    ) {
        return Promise.resolve(documentScanState.value);
    }

    return new Promise((resolve, reject) => {
        resolvePendingDocumentScan = resolve;
        rejectPendingDocumentScan = reject;
    });
};

const scanAction = async (): Promise<void> => {
    if (isAnyScanInProgress.value) {
        return;
    }

    const didStartDocumentScan = await startDocumentScan();

    if (!didStartDocumentScan) {
        return;
    }

    const visitStartedAt = new Date();

    photoCaptureInProgress.value = true;
    scanStartDatetime.value = visitStartedAt;
    hasScan.value = true;
    capturedPhoto.value = null;

    try {
        await requestPhotoCapture();
        const completedDocumentScanState = await waitForDocumentScanCompletion();
        const finalCapturedPhoto = capturedPhoto.value;

        if (finalCapturedPhoto === null) {
            throw new Error('A captured photo is required to store the visit.');
        }

        storeVisit({
            photo: finalCapturedPhoto,
            scan: toVisitScanPayload(completedDocumentScanState),
            visit_at: visitStartedAt.toISOString(),
        });
    } catch {
        if (!capturedPhoto.value) {
            hasScan.value = false;
        }
    } finally {
        photoCaptureInProgress.value = false;
        clearPendingCapture();
        clearPendingDocumentScan();
    }
};

const retakePhoto = (): void => {
    if (!photoCaptureInProgress.value || !capturedPhoto.value) {
        return;
    }

    queuePhotoCapture();
};

const storeVisit = (visitData: VisitPayload): void => {
    Object.assign(visitRequest, visitData);
    void visitRequest.post(RecordVisitController.url());
};
</script>

<template>
    <Head title="Home" />
    <ScanLayout :initial-advert="initialAdvert">
        <div class="grid grid-cols-2 gap-6">
            <LiveVideoPanel
                :capture-request-id="captureRequestId"
                @captured="handlePhotoCaptured"
            />
            <PhotoPanel
                :has-scan="hasScan"
                :photo-data-url="capturedPhoto"
                :scan-in-progress="photoCaptureInProgress"
                @retake="retakePhoto"
            />
            <ScanDataPanel
                :awaiting="isDocumentScanAwaiting"
                :state="documentScanState"
            />
            <ScanImagePanel
                :awaiting="isDocumentScanAwaiting"
                :state="documentScanState"
            />
            <ActionArea @scan="scanAction" :in-progress="isAnyScanInProgress" />
            <div class="flex items-center gap-4">
                <button
                    type="button"
                    class="rounded-md bg-red-300 px-4 py-3 font-semibold uppercase"
                    data-testid="toggle-scan"
                    @click="resetScan"
                >
                    Reset Scan
                </button>
                <span data-testid="scan-state">{{
                    documentScanState.status
                }}</span>
                <span data-testid="photo-state">{{ hasScan }}</span>
            </div>
        </div>
    </ScanLayout>
</template>
