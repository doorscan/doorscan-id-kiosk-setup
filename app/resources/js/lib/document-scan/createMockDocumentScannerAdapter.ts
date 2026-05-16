import type {
    DocumentScanRunController,
    DocumentScannerAdapter,
} from '@/types/scan';

export interface MockDocumentScannerAdapterOptions {
    failureMessage?: string;
    shouldFail?: boolean;
    stepDelayMs?: number;
}

const DEFAULT_STEP_DELAY_MS = 220;

const waitForStep = (delayMs: number, signal: AbortSignal): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new Error('Document scan was aborted.'));

            return;
        }

        const timeoutId = window.setTimeout(() => {
            signal.removeEventListener('abort', abortListener);
            resolve();
        }, delayMs);

        const abortListener = (): void => {
            window.clearTimeout(timeoutId);
            reject(new Error('Document scan was aborted.'));
        };

        signal.addEventListener('abort', abortListener, {
            once: true,
        });
    });
};

export const createMockDocumentScannerAdapter = (
    options: MockDocumentScannerAdapterOptions = {},
): DocumentScannerAdapter => {
    const {
        failureMessage = 'The scanner hardware became unavailable during the scan.',
        shouldFail = false,
        stepDelayMs = DEFAULT_STEP_DELAY_MS,
    } = options;

    const runStep = async (
        controller: DocumentScanRunController,
        task: () => void,
    ): Promise<void> => {
        await waitForStep(stepDelayMs, controller.signal);

        if (controller.signal.aborted) {
            return;
        }

        task();
    };

    return {
        startScan: async (controller) => {
            try {
                await runStep(controller, () => {
                    controller.setFieldInProgress(
                        'scan_image',
                        'Capturing the document image.',
                    );
                });

                await runStep(controller, () => {
                    controller.completeField(
                        'scan_image',
                        '/img/sample-passport.jpg',
                    );
                });

                await runStep(controller, () => {
                    controller.setFieldInProgress(
                        'extracted_face_image',
                        'Extracting the portrait image.',
                    );
                });

                await runStep(controller, () => {
                    controller.completeField(
                        'extracted_face_image',
                        '/img/sample-face.jpg',
                    );
                });

                if (shouldFail) {
                    await runStep(controller, () => {
                        controller.fail(failureMessage);
                    });

                    return;
                }

                await runStep(controller, () => {
                    controller.completeField('first_name', 'Ada');
                });

                await runStep(controller, () => {
                    controller.completeField('last_name', 'Lovelace');
                });

                await runStep(controller, () => {
                    controller.completeField('dob', '1815-12-10');
                });

                await runStep(controller, () => {
                    controller.completeField(
                        'address',
                        null,
                        'Address not returned for this document type.',
                    );
                });

                await runStep(controller, () => {
                    controller.completeField('type', 'passport');
                });

                await runStep(controller, () => {
                    controller.completeField('ocr_data_raw', {
                        documentNumber: '123456789',
                        issuingCountry: 'GBR',
                        mrz: 'P<GBRLOVELACE<<ADA<<<<<<<<<<<<<<<<<<<<<<<',
                    });
                });

                await runStep(controller, () => {
                    controller.succeed('Document scan complete.');
                });
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                throw error;
            }
        },
    };
};
