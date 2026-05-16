<script setup lang="ts">
import {
    computed,
    onBeforeUnmount,
    onMounted,
    shallowRef,
    useTemplateRef,
    watch,
} from 'vue';
import Panel from '@/components/Panel.vue';
import {
    ensureFaceApi,
    type FaceApiModule,
    type FaceDetectionBox,
    type FaceLandmarks,
    type FacePoint,
    TINY_FACE_DETECTOR_MODEL_URL,
} from '@/lib/faceApi';

type CameraState = 'loading' | 'live' | 'unsupported' | 'error';

const props = withDefaults(
    defineProps<{
        captureRequestId?: number;
    }>(),
    {
        captureRequestId: 0,
    },
);

const emit = defineEmits<{
    captured: [photoDataUrl: string];
}>();

const FACE_BOX_HEIGHT_INSET_RATIO = 0.14;
const FACE_BOX_WIDTH_INSET_RATIO = 0.12;
const FACE_DETECTION_IDLE_TIMEOUT_MS = 700;
const FACE_DETECTION_INITIAL_DELAY_MS = 200;
const FACE_DETECTION_INTERVAL_MS = 400;
const FACE_ALIGNMENT_EYE_ROLL_RATIO_MAX = 0.12;
const FACE_ALIGNMENT_MOUTH_CENTERING_RATIO_MAX = 0.2;
const FACE_ALIGNMENT_NOSE_CENTERING_RATIO_MAX = 0.18;
const TINY_FACE_DETECTOR_CONFIG = Object.freeze({
    inputSize: 160,
    scoreThreshold: 0.55,
});

const liveVideoElement = useTemplateRef<HTMLVideoElement>('liveVideoElement');
const faceOverlayElement =
    useTemplateRef<HTMLCanvasElement>('faceOverlayElement');
const cameraState = shallowRef<CameraState>('loading');
const errorMessage = shallowRef<string | null>(null);
const mediaStream = shallowRef<MediaStream | null>(null);
const faceApi = shallowRef<FaceApiModule | null>(null);
const faceDetectionTimerId = shallowRef<number | null>(null);
const faceDetectionIdleId = shallowRef<number | null>(null);
const isFaceDetectionReady = shallowRef(false);
const isFaceDetectionRunning = shallowRef(false);
const isPanelMounted = shallowRef(false);
const isVideoReady = shallowRef(false);

const statusText = computed(() => {
    if (cameraState.value === 'live') {
        return 'Live';
    }

    if (cameraState.value === 'loading') {
        return 'Connecting';
    }

    return 'Camera Unavailable';
});

const helperText = computed(() => {
    if (cameraState.value === 'loading') {
        return 'Connecting to the local webcam for a temporary holding feed.';
    }

    return errorMessage.value ?? 'Camera access is unavailable right now.';
});

const captureCurrentFrame = (): void => {
    const videoElement = liveVideoElement.value;

    if (
        !videoElement ||
        cameraState.value !== 'live' ||
        !isVideoReady.value ||
        videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0
    ) {
        return;
    }

    const captureCanvas = document.createElement('canvas');
    const captureContext = captureCanvas.getContext('2d');

    if (!captureContext) {
        return;
    }

    captureCanvas.width = videoElement.videoWidth;
    captureCanvas.height = videoElement.videoHeight;
    captureContext.drawImage(
        videoElement,
        0,
        0,
        captureCanvas.width,
        captureCanvas.height,
    );

    emit('captured', captureCanvas.toDataURL('image/jpeg', 0.92));
};

const attachStream = (stream: MediaStream): void => {
    mediaStream.value = stream;

    if (!liveVideoElement.value) {
        return;
    }

    (
        liveVideoElement.value as HTMLVideoElement & {
            srcObject: MediaStream | null;
        }
    ).srcObject = stream;
};

const clearScheduledFaceDetection = (): void => {
    if (faceDetectionTimerId.value !== null) {
        window.clearTimeout(faceDetectionTimerId.value);
        faceDetectionTimerId.value = null;
    }

    if (faceDetectionIdleId.value !== null) {
        if (typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(faceDetectionIdleId.value);
        } else {
            globalThis.clearTimeout(faceDetectionIdleId.value);
        }

        faceDetectionIdleId.value = null;
    }
};

const syncFaceOverlaySize = (): boolean => {
    const overlayElement = faceOverlayElement.value;
    const videoElement = liveVideoElement.value;

    if (!overlayElement || !videoElement) {
        return false;
    }

    const nextWidth = videoElement.clientWidth;
    const nextHeight = videoElement.clientHeight;

    if (nextWidth === 0 || nextHeight === 0) {
        return false;
    }

    if (overlayElement.width !== nextWidth) {
        overlayElement.width = nextWidth;
    }

    if (overlayElement.height !== nextHeight) {
        overlayElement.height = nextHeight;
    }

    return true;
};

const clearFaceOverlay = (): void => {
    const overlayElement = faceOverlayElement.value;

    if (!overlayElement) {
        return;
    }

    const context = overlayElement.getContext('2d');

    if (!context) {
        return;
    }

    context.clearRect(0, 0, overlayElement.width, overlayElement.height);
};

const getAverageFacePoint = (points: FacePoint[]): FacePoint | null => {
    if (points.length === 0) {
        return null;
    }

    let totalX = 0;
    let totalY = 0;

    for (const point of points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return null;
        }

        totalX += point.x;
        totalY += point.y;
    }

    return {
        x: totalX / points.length,
        y: totalY / points.length,
    };
};

const getDistanceBetweenFacePoints = (
    startPoint: FacePoint,
    endPoint: FacePoint,
): number => {
    return Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
};

const isFacingCamera = (landmarks: FaceLandmarks): boolean => {
    const leftEyeCenter = getAverageFacePoint(landmarks.getLeftEye());
    const rightEyeCenter = getAverageFacePoint(landmarks.getRightEye());
    const noseCenter = getAverageFacePoint(landmarks.getNose());
    const mouthCenter = getAverageFacePoint(landmarks.getMouth());

    if (!leftEyeCenter || !rightEyeCenter || !noseCenter || !mouthCenter) {
        return false;
    }

    const interEyeDistance = getDistanceBetweenFacePoints(
        leftEyeCenter,
        rightEyeCenter,
    );

    if (!Number.isFinite(interEyeDistance) || interEyeDistance <= 0) {
        return false;
    }

    const eyeMidpoint = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };
    const eyeRollRatio =
        Math.abs(leftEyeCenter.y - rightEyeCenter.y) / interEyeDistance;
    const noseCenteringRatio =
        Math.abs(noseCenter.x - eyeMidpoint.x) / interEyeDistance;
    const mouthCenteringRatio =
        Math.abs(mouthCenter.x - noseCenter.x) / interEyeDistance;

    return (
        eyeRollRatio <= FACE_ALIGNMENT_EYE_ROLL_RATIO_MAX &&
        noseCenteringRatio <= FACE_ALIGNMENT_NOSE_CENTERING_RATIO_MAX &&
        mouthCenteringRatio <= FACE_ALIGNMENT_MOUTH_CENTERING_RATIO_MAX
    );
};

const projectFaceBox = (box: FaceDetectionBox): FaceDetectionBox | null => {
    const overlayElement = faceOverlayElement.value;
    const videoElement = liveVideoElement.value;

    if (
        !overlayElement ||
        !videoElement ||
        videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0
    ) {
        return null;
    }

    const scale = Math.max(
        overlayElement.width / videoElement.videoWidth,
        overlayElement.height / videoElement.videoHeight,
    );
    const scaledWidth = videoElement.videoWidth * scale;
    const scaledHeight = videoElement.videoHeight * scale;
    const offsetX = (overlayElement.width - scaledWidth) / 2;
    const offsetY = (overlayElement.height - scaledHeight) / 2;
    const projectedHeight = box.height * scale;
    const projectedWidth = box.width * scale;
    const heightInset = projectedHeight * FACE_BOX_HEIGHT_INSET_RATIO;
    const widthInset = projectedWidth * FACE_BOX_WIDTH_INSET_RATIO;

    return {
        height: projectedHeight - heightInset,
        width: projectedWidth - widthInset,
        x: box.x * scale + offsetX + widthInset / 2,
        y: box.y * scale + offsetY + heightInset / 2,
    };
};

const drawFaceOutlines = (detections: FaceDetectionBox[]): void => {
    if (!syncFaceOverlaySize()) {
        return;
    }

    const overlayElement = faceOverlayElement.value;

    if (!overlayElement) {
        return;
    }

    const context = overlayElement.getContext('2d');

    if (!context) {
        return;
    }

    context.clearRect(0, 0, overlayElement.width, overlayElement.height);

    if (detections.length === 0) {
        return;
    }

    context.save();
    context.lineWidth = 3;
    context.shadowBlur = 18;
    context.shadowColor = 'rgba(16, 185, 129, 0.6)';
    context.strokeStyle = 'rgba(110, 231, 183, 0.95)';

    detections.forEach((detection) => {
        const projectedBox = projectFaceBox(detection);

        if (!projectedBox) {
            return;
        }

        context.strokeRect(
            projectedBox.x,
            projectedBox.y,
            projectedBox.width,
            projectedBox.height,
        );
    });

    context.restore();
};

const shouldRunFaceDetection = (): boolean => {
    return (
        cameraState.value === 'live' &&
        isVideoReady.value &&
        isFaceDetectionReady.value &&
        document.visibilityState !== 'hidden'
    );
};

const scheduleIdleDetection = (task: () => void): void => {
    if (typeof window.requestIdleCallback === 'function') {
        faceDetectionIdleId.value = window.requestIdleCallback(task, {
            timeout: FACE_DETECTION_IDLE_TIMEOUT_MS,
        });

        return;
    }

    faceDetectionIdleId.value = globalThis.setTimeout(task, 0);
};

const runFaceDetection = async (): Promise<void> => {
    if (
        isFaceDetectionRunning.value ||
        !shouldRunFaceDetection() ||
        !faceApi.value ||
        !liveVideoElement.value
    ) {
        return;
    }

    if (!syncFaceOverlaySize() || liveVideoElement.value.readyState < 2) {
        scheduleFaceDetection();

        return;
    }

    isFaceDetectionRunning.value = true;

    try {
        const detections = await faceApi.value
            .detectAllFaces(
                liveVideoElement.value,
                new faceApi.value.TinyFaceDetectorOptions(
                    TINY_FACE_DETECTOR_CONFIG,
                ),
            )
            .withFaceLandmarks(true);

        drawFaceOutlines(
            detections
                .filter((detection) => isFacingCamera(detection.landmarks))
                .map((detection) => detection.detection.box),
        );
    } catch {
        clearFaceOverlay();
    } finally {
        isFaceDetectionRunning.value = false;

        if (isPanelMounted.value) {
            scheduleFaceDetection();
        }
    }
};

function scheduleFaceDetection(delay = FACE_DETECTION_INTERVAL_MS): void {
    clearScheduledFaceDetection();

    if (!shouldRunFaceDetection()) {
        clearFaceOverlay();

        return;
    }

    faceDetectionTimerId.value = window.setTimeout(() => {
        faceDetectionTimerId.value = null;
        scheduleIdleDetection(() => {
            faceDetectionIdleId.value = null;
            void runFaceDetection();
        });
    }, delay);
}

const startFaceDetection = async (): Promise<void> => {
    try {
        const loadedFaceApi = await ensureFaceApi();

        await Promise.all([
            loadedFaceApi.nets.tinyFaceDetector.loadFromUri(
                TINY_FACE_DETECTOR_MODEL_URL,
            ),
            loadedFaceApi.nets.faceLandmark68TinyNet.loadFromUri(
                TINY_FACE_DETECTOR_MODEL_URL,
            ),
        ]);

        if (!isPanelMounted.value) {
            return;
        }

        faceApi.value = loadedFaceApi;
        isFaceDetectionReady.value = true;
        scheduleFaceDetection(FACE_DETECTION_INITIAL_DELAY_MS);
    } catch {
        faceApi.value = null;
        isFaceDetectionReady.value = false;
        clearFaceOverlay();
    }
};

const handleVideoMetadata = (): void => {
    isVideoReady.value = true;
    scheduleFaceDetection(FACE_DETECTION_INITIAL_DELAY_MS);
};

const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
        clearScheduledFaceDetection();
        clearFaceOverlay();

        return;
    }

    scheduleFaceDetection();
};

const stopStream = (): void => {
    clearScheduledFaceDetection();
    clearFaceOverlay();

    mediaStream.value?.getTracks().forEach((track) => {
        track.stop();
    });

    if (liveVideoElement.value) {
        (
            liveVideoElement.value as HTMLVideoElement & {
                srcObject: MediaStream | null;
            }
        ).srcObject = null;
    }

    mediaStream.value = null;
    isVideoReady.value = false;
};

const startStream = async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
        cameraState.value = 'unsupported';
        errorMessage.value =
            'This browser does not expose webcam access for the holding feed.';

        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: 'user',
            },
        });

        attachStream(stream);
        cameraState.value = 'live';
        void startFaceDetection();
    } catch (error) {
        cameraState.value = 'error';
        errorMessage.value =
            error instanceof Error
                ? error.message
                : 'Camera access is unavailable right now.';
    }
};

onMounted(() => {
    isPanelMounted.value = true;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void startStream();
});

watch(
    () => props.captureRequestId,
    (nextCaptureRequestId, previousCaptureRequestId) => {
        if (nextCaptureRequestId === previousCaptureRequestId) {
            return;
        }

        captureCurrentFrame();
    },
);

onBeforeUnmount(() => {
    isPanelMounted.value = false;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopStream();
});
</script>

<template>
    <Panel :awaiting="false" class="aspect-video overflow-hidden bg-zinc-950">
        <div class="relative h-full w-full">
            <video
                ref="liveVideoElement"
                data-testid="live-video-element"
                autoplay
                muted
                playsinline
                @loadedmetadata="handleVideoMetadata"
                class="h-full w-full object-cover"
                :class="cameraState === 'live' ? 'opacity-100' : 'opacity-0'"
            />
            <canvas
                ref="faceOverlayElement"
                aria-hidden="true"
                data-testid="live-video-face-overlay"
                class="pointer-events-none absolute inset-0 h-full w-full"
            />

            <div
                class="absolute inset-x-0 top-0 flex items-center justify-between bg-black/60 px-3 py-2 text-[0.65rem] font-semibold tracking-[0.3em] text-white uppercase"
            >
                <span>Holding Feed</span>
                <span
                    data-testid="live-video-status"
                    :class="
                        cameraState === 'live'
                            ? 'text-emerald-300'
                            : cameraState === 'loading'
                              ? 'text-amber-200'
                              : 'text-red-200'
                    "
                >
                    {{ statusText }}
                </span>
            </div>

            <div
                v-if="cameraState !== 'live'"
                data-testid="live-video-fallback"
                class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-radial from-zinc-800 via-zinc-950 to-black px-6 text-center text-white"
            >
                <div
                    class="flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/8 text-sm font-semibold tracking-[0.25em] uppercase"
                    :class="cameraState === 'loading' ? 'animate-pulse' : ''"
                >
                    Cam
                </div>
                <div class="space-y-1">
                    <p class="text-sm font-semibold tracking-[0.3em] uppercase">
                        {{ statusText }}
                    </p>
                    <p class="max-w-xs text-sm text-zinc-300">
                        {{ helperText }}
                    </p>
                </div>
            </div>
        </div>
    </Panel>
</template>
