export type DocumentScanStatus =
    | 'ready'
    | 'in-progress'
    | 'failed'
    | 'succeeded';

export type DocumentScanFieldStatus = 'in-progress' | 'completed' | 'failed';

export interface DocumentScanField<T> {
    message: string | null;
    status: DocumentScanFieldStatus;
    value: T | null;
}

export interface DocumentScanResult {
    address: DocumentScanField<string>;
    dob: DocumentScanField<string>;
    extracted_face_image: DocumentScanField<string>;
    first_name: DocumentScanField<string>;
    last_name: DocumentScanField<string>;
    ocr_data_raw: DocumentScanField<unknown>;
    scan_image: DocumentScanField<string>;
    type: DocumentScanField<string>;
}

export type DocumentScanFieldKey = keyof DocumentScanResult;

export type DocumentScanFieldValue<K extends DocumentScanFieldKey> =
    DocumentScanResult[K]['value'];

export interface DocumentScanState {
    finishedAt: Date | null;
    message: string | null;
    result: DocumentScanResult;
    startedAt: Date | null;
    status: DocumentScanStatus;
}

export interface DocumentScanRunController {
    completeField: <K extends DocumentScanFieldKey>(
        field: K,
        value: DocumentScanFieldValue<K>,
        message?: string | null,
    ) => void;
    fail: (message: string) => void;
    failField: <K extends DocumentScanFieldKey>(
        field: K,
        message?: string | null,
    ) => void;
    runId: number;
    setFieldInProgress: <K extends DocumentScanFieldKey>(
        field: K,
        message?: string | null,
    ) => void;
    signal: AbortSignal;
    succeed: (message?: string | null) => void;
}

export interface DocumentScannerAdapter {
    startScan: (controller: DocumentScanRunController) => Promise<void> | void;
}
