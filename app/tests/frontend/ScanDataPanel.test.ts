import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ScanDataPanel from '@/components/ScanDataPanel.vue';
import type { DocumentScanState } from '@/types/scan';

const createDocumentScanState = (): DocumentScanState => ({
    finishedAt: new Date('2026-04-20T21:01:00.000Z'),
    message: 'Scanner completed.',
    result: {
        address: {
            message: 'Not returned for this document type.',
            status: 'completed',
            value: null,
        },
        dob: {
            message: 'DOB could not be read.',
            status: 'failed',
            value: null,
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
                source: 'mrz',
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

describe('ScanDataPanel', () => {
    it('renders only the extractable text field titles and the overall state', () => {
        const wrapper = mount(ScanDataPanel, {
            props: {
                awaiting: false,
                state: createDocumentScanState(),
            },
        });

        expect(wrapper.get('[data-testid="scan-data-status"]').text()).toBe(
            'Failed',
        );
        expect(wrapper.text()).toContain('First name');
        expect(wrapper.text()).toContain('Last name');
        expect(wrapper.text()).toContain('Date of birth');
        expect(wrapper.text()).toContain('Address');
        expect(wrapper.text()).not.toContain('Ada');
        expect(wrapper.text()).not.toContain('Lovelace');
        expect(wrapper.text()).not.toContain('DOB could not be read.');
        expect(wrapper.text()).not.toContain(
            'Not returned for this document type.',
        );
        expect(wrapper.text()).not.toContain('Document type');
        expect(wrapper.text()).not.toContain('Raw OCR data');
        expect(wrapper.text()).not.toContain('Document image');
        expect(wrapper.text()).not.toContain('Extracted face');
    });
});
