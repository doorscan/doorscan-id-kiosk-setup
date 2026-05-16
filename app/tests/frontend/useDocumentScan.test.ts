import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createMockDocumentScannerAdapter,
    useDocumentScan,
} from '@/lib/document-scan';
import type {
    DocumentScanRunController,
    DocumentScannerAdapter,
} from '@/types/scan';

describe('useDocumentScan', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts in the ready state', () => {
        const scan = useDocumentScan(createMockDocumentScannerAdapter());

        expect(scan.state.value.status).toBe('ready');
        expect(scan.canStart.value).toBe(true);
        expect(scan.canReset.value).toBe(false);
        expect(scan.isInProgress.value).toBe(false);
        expect(scan.isTerminal.value).toBe(false);
    });

    it('transitions to succeeded when the mock adapter completes', async () => {
        const scan = useDocumentScan(createMockDocumentScannerAdapter());

        await expect(scan.startScan()).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(3000);

        expect(scan.state.value.status).toBe('succeeded');
        expect(scan.state.value.message).toBe('Document scan complete.');
        expect(scan.state.value.result.first_name.value).toBe('Ada');
        expect(scan.state.value.result.scan_image.value).toBe(
            '/img/sample-passport.jpg',
        );
        expect(scan.isInProgress.value).toBe(false);
        expect(scan.isTerminal.value).toBe(true);
    });

    it('ignores repeated starts while a scan is already in progress', async () => {
        let startCount = 0;
        const adapter: DocumentScannerAdapter = {
            startScan: async () => {
                startCount += 1;
            },
        };
        const scan = useDocumentScan(adapter);

        await expect(scan.startScan()).resolves.toBe(true);
        await expect(scan.startScan()).resolves.toBe(false);

        expect(startCount).toBe(1);
        expect(scan.state.value.status).toBe('in-progress');
    });

    it('stores the failure message when the adapter fails the scan', async () => {
        const scan = useDocumentScan(
            createMockDocumentScannerAdapter({
                failureMessage: 'Hardware disconnected.',
                shouldFail: true,
            }),
        );

        await expect(scan.startScan()).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(1500);

        expect(scan.state.value.status).toBe('failed');
        expect(scan.state.value.message).toBe('Hardware disconnected.');
        expect(scan.isTerminal.value).toBe(true);
    });

    it('can reset after a terminal scan', async () => {
        const scan = useDocumentScan(createMockDocumentScannerAdapter());

        await expect(scan.startScan()).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(3000);

        scan.reset();

        expect(scan.state.value.status).toBe('ready');
        expect(scan.state.value.message).toBeNull();
        expect(scan.state.value.startedAt).toBeNull();
        expect(scan.state.value.finishedAt).toBeNull();
        expect(scan.canStart.value).toBe(true);
    });

    it('drops late updates after a reset during an in-progress scan', async () => {
        let controller: DocumentScanRunController | null = null;
        const adapter: DocumentScannerAdapter = {
            startScan: (nextController) => {
                controller = nextController;

                window.setTimeout(() => {
                    controller?.completeField('first_name', 'Late');
                }, 100);

                window.setTimeout(() => {
                    controller?.succeed('Late completion');
                }, 200);
            },
        };
        const scan = useDocumentScan(adapter);

        await expect(scan.startScan()).resolves.toBe(true);

        scan.reset();
        await vi.advanceTimersByTimeAsync(250);

        expect(scan.state.value.status).toBe('ready');
        expect(scan.state.value.message).toBeNull();
        expect(scan.state.value.result.first_name.value).toBeNull();
    });

    it('treats non-returned fields as completed null values', async () => {
        const scan = useDocumentScan(createMockDocumentScannerAdapter());

        await expect(scan.startScan()).resolves.toBe(true);
        await vi.advanceTimersByTimeAsync(3000);

        expect(scan.state.value.status).toBe('succeeded');
        expect(scan.state.value.result.address.status).toBe('completed');
        expect(scan.state.value.result.address.value).toBeNull();
        expect(scan.state.value.result.address.message).toBe(
            'Address not returned for this document type.',
        );
    });
});
