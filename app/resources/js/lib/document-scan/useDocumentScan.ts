import { computed, readonly, shallowRef } from 'vue';
import type {
    DocumentScanField,
    DocumentScanFieldKey,
    DocumentScanFieldStatus,
    DocumentScannerAdapter,
    DocumentScanResult,
    DocumentScanRunController,
    DocumentScanState,
} from '@/types/scan';

const createDocumentScanField = <T>(
    status: DocumentScanFieldStatus,
    value: T | null = null,
    message: string | null = null,
): DocumentScanField<T> => ({
    message,
    status,
    value,
});

const createDocumentScanResult = (
    status: DocumentScanFieldStatus,
): DocumentScanResult => ({
    address: createDocumentScanField<string>(status),
    dob: createDocumentScanField<string>(status),
    extracted_face_image: createDocumentScanField<string>(status),
    first_name: createDocumentScanField<string>(status),
    last_name: createDocumentScanField<string>(status),
    ocr_data_raw: createDocumentScanField<unknown>(status),
    scan_image: createDocumentScanField<string>(status),
    type: createDocumentScanField<string>(status),
});

const createReadyDocumentScanState = (): DocumentScanState => ({
    finishedAt: null,
    message: null,
    result: createDocumentScanResult('completed'),
    startedAt: null,
    status: 'ready',
});

const createInProgressDocumentScanState = (): DocumentScanState => ({
    finishedAt: null,
    message: null,
    result: createDocumentScanResult('in-progress'),
    startedAt: new Date(),
    status: 'in-progress',
});

const updateDocumentScanField = <K extends DocumentScanFieldKey>(
    currentState: DocumentScanState,
    field: K,
    nextField: DocumentScanResult[K],
): DocumentScanState => ({
    ...currentState,
    result: {
        ...currentState.result,
        [field]: nextField,
    } as DocumentScanResult,
});

export const useDocumentScan = (adapter: DocumentScannerAdapter) => {
    const activeAbortController = shallowRef<AbortController | null>(null);
    const activeRunId = shallowRef<number | null>(null);
    const nextRunId = shallowRef(0);
    const state = shallowRef<DocumentScanState>(createReadyDocumentScanState());

    const canReset = computed(() => {
        return state.value.status !== 'ready';
    });

    const canStart = computed(() => {
        return state.value.status === 'ready';
    });

    const isInProgress = computed(() => {
        return state.value.status === 'in-progress';
    });

    const isTerminal = computed(() => {
        return (
            state.value.status === 'failed' ||
            state.value.status === 'succeeded'
        );
    });

    const isActiveRun = (runId: number, signal: AbortSignal): boolean => {
        return activeRunId.value === runId && !signal.aborted;
    };

    const clearActiveRun = (runId: number): void => {
        if (activeRunId.value !== runId) {
            return;
        }

        activeAbortController.value = null;
        activeRunId.value = null;
    };

    const createRunController = (
        runId: number,
        signal: AbortSignal,
    ): DocumentScanRunController => ({
        completeField: (field, value, message = null) => {
            if (!isActiveRun(runId, signal)) {
                return;
            }

            state.value = updateDocumentScanField(state.value, field, {
                message,
                status: 'completed',
                value,
            } as DocumentScanResult[typeof field]);
        },
        fail: (message) => {
            if (!isActiveRun(runId, signal)) {
                return;
            }

            state.value = {
                ...state.value,
                finishedAt: new Date(),
                message,
                status: 'failed',
            };

            clearActiveRun(runId);
        },
        failField: (field, message = null) => {
            if (!isActiveRun(runId, signal)) {
                return;
            }

            state.value = updateDocumentScanField(state.value, field, {
                message,
                status: 'failed',
                value: null,
            } as DocumentScanResult[typeof field]);
        },
        runId,
        setFieldInProgress: (field, message = null) => {
            if (!isActiveRun(runId, signal)) {
                return;
            }

            state.value = updateDocumentScanField(state.value, field, {
                message,
                status: 'in-progress',
                value: null,
            } as DocumentScanResult[typeof field]);
        },
        signal,
        succeed: (message = null) => {
            if (!isActiveRun(runId, signal)) {
                return;
            }

            state.value = {
                ...state.value,
                finishedAt: new Date(),
                message,
                status: 'succeeded',
            };

            clearActiveRun(runId);
        },
    });

    const reset = (): void => {
        activeAbortController.value?.abort();
        activeAbortController.value = null;
        activeRunId.value = null;
        state.value = createReadyDocumentScanState();
    };

    const startScan = async (): Promise<boolean> => {
        if (!canStart.value) {
            return false;
        }

        const runId = nextRunId.value + 1;
        const abortController = new AbortController();
        const controller = createRunController(runId, abortController.signal);

        nextRunId.value = runId;
        activeAbortController.value = abortController;
        activeRunId.value = runId;
        state.value = createInProgressDocumentScanState();

        void Promise.resolve(adapter.startScan(controller)).catch(
            (error: unknown) => {
                if (!isActiveRun(runId, abortController.signal)) {
                    return;
                }

                const message =
                    error instanceof Error
                        ? error.message
                        : 'Document scan failed.';

                controller.fail(message);
            },
        );

        return true;
    };

    return {
        canReset,
        canStart,
        isInProgress,
        isTerminal,
        reset,
        startScan,
        state: readonly(state),
    };
};
