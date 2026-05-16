export interface AdvertDisplay {
    id: number;
    src: string;
}

export interface LiveAdvertsPayload {
    adverts: AdvertDisplay[];
    advert_display_time_in_seconds: number;
}

export interface AdvertViewPayload {
    advert_id: number;
    displayed_seconds: number;
    ended_at: string;
    started_at: string;
}
