import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ScanImagePanel from '@/pages/ScanImagePanel.vue';
import type { DocumentScanState } from '@/types/scan';

const createDocumentScanState = (): DocumentScanState => ({
    finishedAt: new Date('2026-04-20T21:01:00.000Z'),
    message: 'Scanner hardware unavailable.',
    result: {
        address: {
            message: null,
            status: 'completed',
            value: null,
        },
        dob: {
            message: null,
            status: 'completed',
            value: '1815-12-10',
        },
        extracted_face_image: {
            message: null,
            status: 'completed',
            value: '/img/sample-face.jpg',
        },
        first_name: {
            message: null,
            status: 'completed',
            value: 'Ada',
        },
        last_name: {
            message: null,
            status: 'completed',
            value: 'Lovelace',
        },
        ocr_data_raw: {
            message: null,
            status: 'completed',
            value: {
                source: 'ocr',
            },
        },
        scan_image: {
            message: null,
            status: 'completed',
            value: '/img/sample-passport.jpg',
        },
        type: {
            message: null,
            status: 'completed',
            value: 'passport',
        },
    },
    startedAt: new Date('2026-04-20T21:00:00.000Z'),
    status: 'failed',
});

describe('ScanImagePanel', () => {
    it('renders the blurred scan as the base image and overlays the extracted face', () => {
        const wrapper = mount(ScanImagePanel, {
            props: {
                awaiting: false,
                state: createDocumentScanState(),
            },
        });

        expect(
            wrapper.get('[data-testid="scan-face-image"]').attributes('src'),
        ).toBe('/img/sample-face.jpg');
        expect(
            wrapper.get('[data-testid="scan-face-image"]').classes(),
        ).toContain('object-contain');
        expect(
            wrapper
                .get('[data-testid="scan-document-image"]')
                .attributes('src'),
        ).toBe('/img/sample-passport.jpg');
        expect(
            wrapper.get('[data-testid="scan-document-image"]').classes(),
        ).toContain('blur-xs');
        expect(wrapper.get('[data-testid="scan-failure-message"]').text()).toBe(
            'Scanner hardware unavailable.',
        );
    });
});
