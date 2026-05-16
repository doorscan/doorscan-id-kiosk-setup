import type { DocumentScanState, DocumentScanStatus } from '@/types/scan';

export type CompletedDocumentScanStatus = Extract<
    DocumentScanStatus,
    'failed' | 'succeeded'
>;

export interface VisitScanPayload {
    data: {
        address: string | null;
        dob: string | null;
        first_name: string | null;
        last_name: string | null;
        ocr_data_raw: Record<string, string> | null;
        type: string | null;
    };
    finished_at: string | null;
    images: {
        extracted_face_image: string | null;
        scan_image: string | null;
    };
    message: string | null;
    started_at: string | null;
    status: CompletedDocumentScanStatus;
}

export interface VisitPayload {
    photo: string;
    scan: VisitScanPayload;
    visit_at: string;
}

export const toVisitScanPayload = (
    state: DocumentScanState,
): VisitScanPayload => {
    if (state.status !== 'failed' && state.status !== 'succeeded') {
        throw new Error('Document scan must be complete before storing a visit.');
    }

    return {
        data: {
            address: state.result.address.value,
            dob: state.result.dob.value,
            first_name: state.result.first_name.value,
            last_name: state.result.last_name.value,
            ocr_data_raw:
                typeof state.result.ocr_data_raw.value === 'object' &&
                state.result.ocr_data_raw.value !== null &&
                !Array.isArray(state.result.ocr_data_raw.value)
                    ? Object.fromEntries(
                          Object.entries(state.result.ocr_data_raw.value).map(
                              ([key, value]) => [key, String(value)],
                          ),
                      )
                    : null,
            type: state.result.type.value,
        },
        finished_at: state.finishedAt?.toISOString() ?? null,
        images: {
            extracted_face_image: state.result.extracted_face_image.value,
            scan_image: state.result.scan_image.value,
        },
        message: state.message,
        started_at: state.startedAt?.toISOString() ?? null,
        status: state.status,
    };
};
