import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FaceApiModule, FaceLandmarks, FacePoint } from '@/lib/faceApi';

const faceApiMocks = vi.hoisted(() => {
    const loadDetectorFromUri = vi.fn().mockResolvedValue(undefined);
    const loadLandmarksFromUri = vi.fn().mockResolvedValue(undefined);
    const withFaceLandmarks = vi.fn();
    const detectAllFaces = vi.fn(() => ({
        withFaceLandmarks,
    }));
    const TinyFaceDetectorOptions = vi.fn(function (
        this: { options?: unknown },
        options?: unknown,
    ) {
        this.options = options;
    });
    const faceApiModule = {
        TinyFaceDetectorOptions,
        detectAllFaces,
        nets: {
            faceLandmark68TinyNet: {
                loadFromUri: loadLandmarksFromUri,
            },
            tinyFaceDetector: {
                loadFromUri: loadDetectorFromUri,
            },
        },
    } satisfies FaceApiModule;
    const ensureFaceApi = vi.fn().mockResolvedValue(faceApiModule);

    return {
        detectAllFaces,
        ensureFaceApi,
        loadDetectorFromUri,
        loadLandmarksFromUri,
        TinyFaceDetectorOptions,
        withFaceLandmarks,
    };
});

vi.mock('@/lib/faceApi', () => ({
    TINY_FACE_DETECTOR_MODEL_URL: '/models/face-api',
    ensureFaceApi: faceApiMocks.ensureFaceApi,
}));

import LiveVideoPanel from '@/pages/LiveVideoPanel.vue';

const originalMediaDevices = navigator.mediaDevices;
const originalRequestIdleCallback = window.requestIdleCallback;
const originalCancelIdleCallback = window.cancelIdleCallback;
const originalCanvasGetContext = window.HTMLCanvasElement.prototype.getContext;

const clearRect = vi.fn();
const drawImage = vi.fn();
const restore = vi.fn();
const save = vi.fn();
const strokeRect = vi.fn();
const originalCanvasToDataURL = window.HTMLCanvasElement.prototype.toDataURL;

Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    get() {
        return (this as HTMLMediaElement & { __srcObject?: MediaStream | null })
            .__srcObject;
    },
    set(value) {
        (
            this as HTMLMediaElement & { __srcObject?: MediaStream | null }
        ).__srcObject = value as MediaStream | null;
    },
});

const createFacePoint = (x: number, y: number): FacePoint => ({ x, y });

const createLandmarks = ({
    leftEye,
    mouth,
    nose,
    rightEye,
}: {
    leftEye: FacePoint[];
    mouth: FacePoint[];
    nose: FacePoint[];
    rightEye: FacePoint[];
}): FaceLandmarks => ({
    getLeftEye: () => leftEye,
    getMouth: () => mouth,
    getNose: () => nose,
    getRightEye: () => rightEye,
});

const createFrontFacingLandmarks = (): FaceLandmarks =>
    createLandmarks({
        leftEye: [createFacePoint(32, 42), createFacePoint(40, 42)],
        mouth: [createFacePoint(54, 84), createFacePoint(66, 84)],
        nose: [createFacePoint(58, 58), createFacePoint(62, 60)],
        rightEye: [createFacePoint(80, 44), createFacePoint(88, 44)],
    });

const createTurnedFaceLandmarks = (): FaceLandmarks =>
    createLandmarks({
        leftEye: [createFacePoint(32, 42), createFacePoint(40, 42)],
        mouth: [createFacePoint(70, 84), createFacePoint(82, 84)],
        nose: [createFacePoint(74, 58), createFacePoint(78, 60)],
        rightEye: [createFacePoint(80, 44), createFacePoint(88, 44)],
    });

const createDetectionsWithLandmarks = (landmarks: FaceLandmarks[]) => {
    return landmarks.map((faceLandmarks) => ({
        detection: {
            box: {
                height: 80,
                width: 120,
                x: 24,
                y: 32,
            },
        },
        landmarks: faceLandmarks,
    }));
};

const setVideoDimensions = (videoElement: HTMLVideoElement): void => {
    Object.defineProperties(videoElement, {
        clientHeight: {
            configurable: true,
            value: 480,
        },
        clientWidth: {
            configurable: true,
            value: 640,
        },
        readyState: {
            configurable: true,
            value: 4,
        },
        videoHeight: {
            configurable: true,
            value: 480,
        },
        videoWidth: {
            configurable: true,
            value: 640,
        },
    });
};

beforeEach(() => {
    vi.useFakeTimers();

    clearRect.mockReset();
    drawImage.mockReset();
    restore.mockReset();
    save.mockReset();
    strokeRect.mockReset();

    faceApiMocks.detectAllFaces.mockClear();
    faceApiMocks.ensureFaceApi.mockClear();
    faceApiMocks.loadDetectorFromUri.mockClear();
    faceApiMocks.loadLandmarksFromUri.mockClear();
    faceApiMocks.TinyFaceDetectorOptions.mockClear();
    faceApiMocks.withFaceLandmarks.mockReset();
    faceApiMocks.withFaceLandmarks.mockResolvedValue(
        createDetectionsWithLandmarks([createFrontFacingLandmarks()]),
    );

    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
    });

    window.requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
        callback({
            didTimeout: false,
            timeRemaining: () => 16,
        } as IdleDeadline);

        return 1;
    });
    window.cancelIdleCallback = vi.fn();

    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => {
        return {
            clearRect,
            drawImage,
            lineWidth: 0,
            restore,
            save,
            shadowBlur: 0,
            shadowColor: '',
            strokeRect,
            strokeStyle: '',
        } as unknown as CanvasRenderingContext2D;
    });
    window.HTMLCanvasElement.prototype.toDataURL = vi.fn(
        () => 'data:image/jpeg;base64,captured-frame',
    );
});

afterEach(() => {
    vi.useRealTimers();

    Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: originalMediaDevices,
    });

    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    window.HTMLCanvasElement.prototype.getContext = originalCanvasGetContext;
    window.HTMLCanvasElement.prototype.toDataURL = originalCanvasToDataURL;
});

describe('LiveVideoPanel', () => {
    it('requests the webcam, loads both face-api models, and draws face outlines for frontal faces', async () => {
        const stop = vi.fn();
        const stream = {
            getTracks: () => [{ stop }],
        } as unknown as MediaStream;
        const getUserMedia = vi.fn().mockResolvedValue(stream);

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia,
            },
        });

        const wrapper = mount(LiveVideoPanel);

        await flushPromises();

        const videoElement = wrapper.get('[data-testid="live-video-element"]')
            .element as HTMLVideoElement & { srcObject: MediaStream | null };

        setVideoDimensions(videoElement);
        videoElement.dispatchEvent(new Event('loadedmetadata'));

        await flushPromises();
        vi.advanceTimersByTime(200);
        await flushPromises();

        expect(getUserMedia).toHaveBeenCalledWith({
            audio: false,
            video: {
                facingMode: 'user',
            },
        });
        expect(faceApiMocks.ensureFaceApi).toHaveBeenCalledTimes(1);
        expect(faceApiMocks.loadDetectorFromUri).toHaveBeenCalledWith(
            '/models/face-api',
        );
        expect(faceApiMocks.loadLandmarksFromUri).toHaveBeenCalledWith(
            '/models/face-api',
        );
        expect(faceApiMocks.TinyFaceDetectorOptions).toHaveBeenCalledWith({
            inputSize: 160,
            scoreThreshold: 0.55,
        });
        expect(faceApiMocks.detectAllFaces).toHaveBeenCalledWith(
            videoElement,
            expect.any(Object),
        );
        expect(faceApiMocks.withFaceLandmarks).toHaveBeenCalledWith(true);
        const [x, y, width, height] = strokeRect.mock.calls[0];

        expect(x).toBeCloseTo(31.2);
        expect(y).toBeCloseTo(37.6);
        expect(width).toBeCloseTo(105.6);
        expect(height).toBeCloseTo(68.8);
        expect(wrapper.get('[data-testid="live-video-status"]').text()).toBe(
            'Live',
        );
        expect(videoElement.srcObject).toBe(stream);
        expect(
            wrapper.find('[data-testid="live-video-fallback"]').exists(),
        ).toBe(false);

        wrapper.unmount();

        expect(stop).toHaveBeenCalledTimes(1);
    });

    it('does not draw face outlines when the detected face is turned away', async () => {
        const stream = {
            getTracks: () => [{ stop: vi.fn() }],
        } as unknown as MediaStream;
        const getUserMedia = vi.fn().mockResolvedValue(stream);

        faceApiMocks.withFaceLandmarks.mockResolvedValue(
            createDetectionsWithLandmarks([createTurnedFaceLandmarks()]),
        );

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia,
            },
        });

        const wrapper = mount(LiveVideoPanel);

        await flushPromises();

        const videoElement = wrapper.get('[data-testid="live-video-element"]')
            .element as HTMLVideoElement;

        setVideoDimensions(videoElement);
        videoElement.dispatchEvent(new Event('loadedmetadata'));

        await flushPromises();
        vi.advanceTimersByTime(200);
        await flushPromises();

        expect(faceApiMocks.withFaceLandmarks).toHaveBeenCalledWith(true);
        expect(strokeRect).not.toHaveBeenCalled();

        wrapper.unmount();
    });

    it('leaves the overlay empty when no detections are returned', async () => {
        const stream = {
            getTracks: () => [{ stop: vi.fn() }],
        } as unknown as MediaStream;
        const getUserMedia = vi.fn().mockResolvedValue(stream);

        faceApiMocks.withFaceLandmarks.mockResolvedValue([]);

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia,
            },
        });

        const wrapper = mount(LiveVideoPanel);

        await flushPromises();

        const videoElement = wrapper.get('[data-testid="live-video-element"]')
            .element as HTMLVideoElement;

        setVideoDimensions(videoElement);
        videoElement.dispatchEvent(new Event('loadedmetadata'));

        await flushPromises();
        vi.advanceTimersByTime(200);
        await flushPromises();

        expect(faceApiMocks.withFaceLandmarks).toHaveBeenCalledWith(true);
        expect(strokeRect).not.toHaveBeenCalled();
        expect(clearRect).toHaveBeenCalled();

        wrapper.unmount();
    });

    it('shows the holding fallback when webcam access is unavailable', async () => {
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: undefined,
        });

        const wrapper = mount(LiveVideoPanel);

        await flushPromises();

        expect(faceApiMocks.ensureFaceApi).not.toHaveBeenCalled();
        expect(wrapper.get('[data-testid="live-video-status"]').text()).toBe(
            'Camera Unavailable',
        );
        expect(
            wrapper.get('[data-testid="live-video-fallback"]').text(),
        ).toContain('holding feed');
    });

    it('captures the current webcam frame when requested', async () => {
        const stream = {
            getTracks: () => [{ stop: vi.fn() }],
        } as unknown as MediaStream;
        const getUserMedia = vi.fn().mockResolvedValue(stream);

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia,
            },
        });

        const wrapper = mount(LiveVideoPanel, {
            props: {
                captureRequestId: 0,
            },
        });

        await flushPromises();

        const videoElement = wrapper.get('[data-testid="live-video-element"]')
            .element as HTMLVideoElement;

        setVideoDimensions(videoElement);
        videoElement.dispatchEvent(new Event('loadedmetadata'));

        await flushPromises();
        await wrapper.setProps({
            captureRequestId: 1,
        });
        await flushPromises();

        expect(drawImage).toHaveBeenCalledWith(videoElement, 0, 0, 640, 480);
        expect(wrapper.emitted('captured')).toEqual([
            ['data:image/jpeg;base64,captured-frame'],
        ]);
    });
});
