export interface FaceDetectionBox {
    height: number;
    width: number;
    x: number;
    y: number;
}

export interface FaceDetectionResult {
    box: FaceDetectionBox;
}

export interface FacePoint {
    x: number;
    y: number;
}

export interface FaceLandmarks {
    getLeftEye: () => FacePoint[];
    getMouth: () => FacePoint[];
    getNose: () => FacePoint[];
    getRightEye: () => FacePoint[];
}

export interface FaceDetectionWithLandmarksResult {
    detection: FaceDetectionResult;
    landmarks: FaceLandmarks;
}

export interface TinyFaceDetectorOptionsConfig {
    inputSize?: number;
    scoreThreshold?: number;
}

export interface FaceDetectionTask {
    withFaceLandmarks: (
        useTinyLandmarkNet?: boolean,
    ) => Promise<FaceDetectionWithLandmarksResult[]>;
}

export interface FaceApiModule {
    TinyFaceDetectorOptions: new (
        options?: TinyFaceDetectorOptionsConfig,
    ) => object;
    detectAllFaces: (
        input: HTMLVideoElement,
        options: object,
    ) => FaceDetectionTask;
    nets: {
        faceLandmark68TinyNet: {
            loadFromUri: (uri: string) => Promise<void>;
        };
        tinyFaceDetector: {
            loadFromUri: (uri: string) => Promise<void>;
        };
    };
}

const FACE_API_SCRIPT_URL = '/vendor/face-api/face-api.min.js';

export const TINY_FACE_DETECTOR_MODEL_URL = '/models/face-api';

let faceApiPromise: Promise<FaceApiModule> | null = null;

type FaceApiWindow = Window & {
    faceapi?: FaceApiModule;
};

export const ensureFaceApi = async (): Promise<FaceApiModule> => {
    const existingFaceApi = (window as FaceApiWindow).faceapi;

    if (existingFaceApi) {
        return existingFaceApi;
    }

    if (faceApiPromise) {
        return faceApiPromise;
    }

    faceApiPromise = new Promise<FaceApiModule>((resolve, reject) => {
        const scriptElement = document.createElement('script');

        scriptElement.async = true;
        scriptElement.crossOrigin = 'anonymous';
        scriptElement.dataset.faceApiScript = 'true';
        scriptElement.src = FACE_API_SCRIPT_URL;

        scriptElement.addEventListener('load', () => {
            const loadedFaceApi = (window as FaceApiWindow).faceapi;

            if (loadedFaceApi) {
                resolve(loadedFaceApi);

                return;
            }

            faceApiPromise = null;

            reject(
                new Error(
                    'face-api.js loaded without exposing window.faceapi.',
                ),
            );
        });

        scriptElement.addEventListener('error', () => {
            faceApiPromise = null;

            reject(new Error('Unable to load face-api.js.'));
        });

        document.head.appendChild(scriptElement);
    });

    return faceApiPromise;
};
