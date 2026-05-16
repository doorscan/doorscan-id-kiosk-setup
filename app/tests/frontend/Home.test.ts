import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, watch } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '@/pages/Home.vue';
import type { DocumentScanRunController } from '@/types/scan';
import type { VisitPayload } from '@/types/visit';

const { documentScanMocks, recordVisitRoute, visitHttpMock } = vi.hoisted(
    () => {
        let activeController: DocumentScanRunController | null = null;
        const startScan = vi.fn(
            async (controller: DocumentScanRunController) => {
                activeController = controller;
            },
        );

        return {
            documentScanMocks: {
                getActiveController: () => activeController,
                reset: () => {
                    activeController = null;
                    startScan.mockClear();
                },
                startScan,
            },
            recordVisitRoute: Object.assign(vi.fn(), {
                url: vi.fn(() => '/visit'),
            }),
            visitHttpMock: {
                photo: '',
                post: vi.fn().mockResolvedValue({}),
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
                } satisfies VisitPayload['scan'],
                visit_at: '',
            },
        };
    },
);

vi.mock('@inertiajs/vue3', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/vue3')>();

    return {
        ...actual,
        Head: defineComponent({
            name: 'Head',
            template: '<div><slot /></div>',
        }),
        Link: defineComponent({
            name: 'Link',
            props: {
                as: {
                    type: String,
                    default: 'a',
                },
            },
            template: '<component :is="as"><slot /></component>',
        }),
        useHttp: vi.fn(() => visitHttpMock),
    };
});

vi.mock('@/actions/App/Http/Controllers/RecordVisitController', () => ({
    default: recordVisitRoute,
}));

vi.mock('@/lib/document-scan', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/document-scan')>();

    return {
        ...actual,
        createMockDocumentScannerAdapter: vi.fn(() => ({
            startScan: documentScanMocks.startScan,
        })),
    };
});

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T21:00:00.000Z'));
    documentScanMocks.reset();
    visitHttpMock.photo = '';
    visitHttpMock.scan = {
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
    };
    visitHttpMock.visit_at = '';
    visitHttpMock.post.mockClear();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Home page scan state', () => {
    it('keeps the document scan state separate from the photo capture flow', async () => {
        const wrapper = mount(Home, {
            global: {
                stubs: {
                    ScanLayout: {
                        template: '<div><slot /></div>',
                    },
                    LiveVideoPanel: defineComponent({
                        name: 'LiveVideoPanelStub',
                        props: {
                            captureRequestId: {
                                type: Number,
                                required: true,
                            },
                        },
                        emits: ['captured'],
                        setup(props, { emit }) {
                            watch(
                                () => props.captureRequestId,
                                (
                                    nextCaptureRequestId,
                                    previousCaptureRequestId,
                                ) => {
                                    if (
                                        nextCaptureRequestId ===
                                        previousCaptureRequestId
                                    ) {
                                        return;
                                    }

                                    emit(
                                        'captured',
                                        nextCaptureRequestId === 1
                                            ? 'data:image/jpeg;base64,home-captured-frame'
                                            : 'data:image/jpeg;base64,home-retaken-frame',
                                    );
                                },
                            );

                            return {};
                        },
                        template: '<div>Live video</div>',
                    }),
                    ScanDataPanel: {
                        props: ['awaiting', 'state'],
                        template:
                            '<div data-testid="scan-data-panel">{{ awaiting }}|{{ state.status }}</div>',
                    },
                    ScanImagePanel: {
                        props: ['awaiting', 'state'],
                        template:
                            '<div data-testid="scan-image-panel">{{ awaiting }}|{{ state.status }}</div>',
                    },
                    ActionArea: {
                        props: ['inProgress'],
                        emits: ['scan'],
                        template:
                            '<button type="button" data-testid="scan-action" @click="$emit(\'scan\')">{{ inProgress }}</button>',
                    },
                },
            },
        });

        const state = () => wrapper.get('[data-testid="scan-state"]').text();

        expect(state()).toBe('ready');
        expect(wrapper.get('[data-testid="photo-state"]').text()).toBe('false');
        expect(wrapper.text()).toContain('Ready for Photo');
        expect(wrapper.get('[data-testid="scan-data-panel"]').text()).toBe(
            'true|ready',
        );
        expect(wrapper.get('[data-testid="scan-image-panel"]').text()).toBe(
            'true|ready',
        );
        expect(wrapper.find('[data-testid="captured-photo"]').exists()).toBe(
            false,
        );
        expect(wrapper.get('[data-testid="scan-action"]').text()).toBe('false');

        await wrapper.get('[data-testid="scan-action"]').trigger('click');
        await flushPromises();

        expect(documentScanMocks.startScan).toHaveBeenCalledTimes(1);
        expect(visitHttpMock.post).not.toHaveBeenCalled();
        expect(state()).toBe('in-progress');
        expect(wrapper.get('[data-testid="photo-state"]').text()).toBe('true');
        expect(wrapper.text()).not.toContain('Ready for Photo');
        expect(
            wrapper.get('[data-testid="captured-photo"]').attributes('src'),
        ).toBe('data:image/jpeg;base64,home-captured-frame');
        expect(wrapper.get('[data-testid="scan-data-panel"]').text()).toBe(
            'false|in-progress',
        );
        expect(wrapper.get('[data-testid="scan-image-panel"]').text()).toBe(
            'false|in-progress',
        );
        expect(wrapper.get('[data-testid="scan-action"]').text()).toBe('true');

        documentScanMocks
            .getActiveController()
            ?.completeField('first_name', 'Ada');
        documentScanMocks
            .getActiveController()
            ?.completeField('scan_image', '/img/sample-passport.jpg');
        documentScanMocks
            .getActiveController()
            ?.completeField('extracted_face_image', '/img/sample-face.jpg');
        documentScanMocks
            .getActiveController()
            ?.completeField('dob', '1815-12-10');
        documentScanMocks
            .getActiveController()
            ?.succeed('Document scan complete.');
        await flushPromises();

        expect(visitHttpMock.photo).toBe(
            'data:image/jpeg;base64,home-captured-frame',
        );
        expect(visitHttpMock.visit_at).toBe('2026-04-20T21:00:00.000Z');
        expect(visitHttpMock.scan).toMatchObject({
            data: {
                dob: '1815-12-10',
                first_name: 'Ada',
            },
            images: {
                extracted_face_image: '/img/sample-face.jpg',
                scan_image: '/img/sample-passport.jpg',
            },
            message: 'Document scan complete.',
            status: 'succeeded',
        });
        expect(visitHttpMock.post).toHaveBeenCalledWith('/visit');
        expect(state()).toBe('succeeded');
        expect(wrapper.get('[data-testid="scan-action"]').text()).toBe('false');
    });

    it('resets both scan flows and ignores stale document scan updates', async () => {
        const wrapper = mount(Home, {
            global: {
                stubs: {
                    ScanLayout: {
                        template: '<div><slot /></div>',
                    },
                    LiveVideoPanel: {
                        template: '<div>Live video</div>',
                    },
                    ScanDataPanel: {
                        props: ['awaiting', 'state'],
                        template:
                            '<div data-testid="scan-data-panel">{{ awaiting }}|{{ state.status }}</div>',
                    },
                    ScanImagePanel: {
                        props: ['awaiting', 'state'],
                        template:
                            '<div data-testid="scan-image-panel">{{ awaiting }}|{{ state.status }}</div>',
                    },
                    ActionArea: {
                        props: ['inProgress'],
                        emits: ['scan'],
                        template:
                            '<button type="button" data-testid="scan-action" @click="$emit(\'scan\')">{{ inProgress }}</button>',
                    },
                },
            },
        });

        const state = () => wrapper.get('[data-testid="scan-state"]').text();

        await wrapper.get('[data-testid="scan-action"]').trigger('click');
        await flushPromises();

        expect(state()).toBe('in-progress');
        expect(wrapper.get('[data-testid="scan-action"]').text()).toBe('true');

        await wrapper.get('[data-testid="toggle-scan"]').trigger('click');
        await flushPromises();

        documentScanMocks.getActiveController()?.succeed('Too late.');
        await flushPromises();

        expect(state()).toBe('ready');
        expect(wrapper.get('[data-testid="photo-state"]').text()).toBe('false');
        expect(wrapper.get('[data-testid="scan-data-panel"]').text()).toBe(
            'true|ready',
        );
        expect(wrapper.get('[data-testid="scan-image-panel"]').text()).toBe(
            'true|ready',
        );
        expect(wrapper.text()).toContain('Ready for Photo');
        expect(wrapper.get('[data-testid="scan-action"]').text()).toBe('false');
    });
});
