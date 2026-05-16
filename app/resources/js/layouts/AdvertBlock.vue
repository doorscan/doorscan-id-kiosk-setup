<script setup lang="ts">
import LiveAdvertsController from '@/actions/App/Http/Controllers/LiveAdvertsController';
import StoreAdvertViewController from '@/actions/App/Http/Controllers/StoreAdvertViewController';
import type {
    AdvertDisplay,
    AdvertViewPayload,
    LiveAdvertsPayload,
} from '@/lib/adverts';
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';

const DEFAULT_ADVERT_DISPLAY_TIME_IN_SECONDS = 60;

const props = withDefaults(
    defineProps<{
        initialAdvert?: AdvertDisplay | null;
    }>(),
    {
        initialAdvert: null,
    },
);

const currentAdvert = shallowRef<AdvertDisplay | null>(props.initialAdvert);
const currentAdvertStartedAt = shallowRef<string | null>(
    props.initialAdvert ? new Date().toISOString() : null,
);
const liveAdverts = shallowRef<AdvertDisplay[]>([]);
const advertDisplayTimeInMilliseconds = shallowRef(
    DEFAULT_ADVERT_DISPLAY_TIME_IN_SECONDS * 1000,
);

let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let activeLiveAdvertsRequestController: AbortController | null = null;
let lastFlushedSessionKey: string | null = null;
let isUnmounted = false;

const clearPollTimeout = (): void => {
    if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
    }
};

const getCsrfToken = (): string | null => {
    return document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content') ?? null;
};

const sanitiseAdverts = (adverts: AdvertDisplay[]): AdvertDisplay[] => {
    const seenAdvertIds = new Set<number>();

    return adverts.filter((advert) => {
        if (advert.src.length === 0 || seenAdvertIds.has(advert.id)) {
            return false;
        }

        seenAdvertIds.add(advert.id);

        return true;
    });
};

const setAdvertDisplayTime = (seconds: number): void => {
    advertDisplayTimeInMilliseconds.value =
        Math.max(1, seconds || DEFAULT_ADVERT_DISPLAY_TIME_IN_SECONDS) * 1000;
};

const synchroniseLiveAdverts = async (): Promise<void> => {
    activeLiveAdvertsRequestController?.abort();

    const requestController = new AbortController();
    activeLiveAdvertsRequestController = requestController;

    try {
        const response = await fetch(LiveAdvertsController.url(), {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: requestController.signal,
        });

        if (!response.ok) {
            throw new Error('Unable to load live adverts.');
        }

        const payload = (await response.json()) as LiveAdvertsPayload;

        liveAdverts.value = sanitiseAdverts(payload.adverts);
        setAdvertDisplayTime(payload.advert_display_time_in_seconds);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return;
        }
    } finally {
        if (activeLiveAdvertsRequestController === requestController) {
            activeLiveAdvertsRequestController = null;
        }
    }
};

const resolveNextAdvert = (): AdvertDisplay | null => {
    if (liveAdverts.value.length === 0) {
        return null;
    }

    if (currentAdvert.value === null) {
        return liveAdverts.value[0] ?? null;
    }

    if (liveAdverts.value.length === 1) {
        return liveAdverts.value[0] ?? null;
    }

    const currentIndex = liveAdverts.value.findIndex(
        (advert) => advert.id === currentAdvert.value?.id,
    );

    if (currentIndex === -1) {
        if (
            props.initialAdvert !== null &&
            liveAdverts.value[0]?.id === props.initialAdvert.id &&
            liveAdverts.value.length > 1
        ) {
            return liveAdverts.value[1] ?? null;
        }

        return liveAdverts.value[0] ?? null;
    }

    return liveAdverts.value[(currentIndex + 1) % liveAdverts.value.length] ?? null;
};

const startAdvertSession = (advert: AdvertDisplay | null): void => {
    currentAdvert.value = advert;
    currentAdvertStartedAt.value = advert ? new Date().toISOString() : null;
};

const buildAdvertViewPayload = (): AdvertViewPayload | null => {
    if (!currentAdvert.value || !currentAdvertStartedAt.value) {
        return null;
    }

    const endedAt = new Date().toISOString();
    const displayedSeconds = Math.max(
        0,
        Math.round(
            (new Date(endedAt).getTime() -
                new Date(currentAdvertStartedAt.value).getTime()) /
                1000,
        ),
    );

    return {
        advert_id: currentAdvert.value.id,
        displayed_seconds: displayedSeconds,
        ended_at: endedAt,
        started_at: currentAdvertStartedAt.value,
    };
};

const sendAdvertViewWithFetch = (payload: AdvertViewPayload): void => {
    const csrfToken = getCsrfToken();

    void fetch(StoreAdvertViewController.url(), {
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
            'X-Requested-With': 'XMLHttpRequest',
        },
        keepalive: true,
        method: 'POST',
    });
};

const sendAdvertViewWithBeacon = (payload: AdvertViewPayload): boolean => {
    if (typeof navigator.sendBeacon !== 'function') {
        return false;
    }

    const formData = new FormData();
    const csrfToken = getCsrfToken();

    formData.append('advert_id', String(payload.advert_id));
    formData.append('displayed_seconds', String(payload.displayed_seconds));
    formData.append('ended_at', payload.ended_at);
    formData.append('started_at', payload.started_at);

    if (csrfToken) {
        formData.append('_token', csrfToken);
    }

    return navigator.sendBeacon(StoreAdvertViewController.url(), formData);
};

const flushCurrentAdvertView = (preferBeacon = false): void => {
    const payload = buildAdvertViewPayload();

    if (!payload) {
        return;
    }

    const sessionKey = `${payload.advert_id}:${payload.started_at}`;

    if (sessionKey === lastFlushedSessionKey) {
        return;
    }

    lastFlushedSessionKey = sessionKey;
    currentAdvertStartedAt.value = null;

    if (!preferBeacon || !sendAdvertViewWithBeacon(payload)) {
        sendAdvertViewWithFetch(payload);
    }
};

const rotateAdvert = async (): Promise<void> => {
    if (isUnmounted) {
        return;
    }

    await synchroniseLiveAdverts();

    if (isUnmounted) {
        return;
    }

    const nextAdvert = resolveNextAdvert();

    if (currentAdvert.value?.id !== nextAdvert?.id) {
        flushCurrentAdvertView();
        startAdvertSession(nextAdvert);
    }

    scheduleRotation();
};

const scheduleRotation = (): void => {
    clearPollTimeout();

    if (isUnmounted) {
        return;
    }

    pollTimeout = setTimeout(() => {
        void rotateAdvert();
    }, advertDisplayTimeInMilliseconds.value);
};

const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
        flushCurrentAdvertView(true);

        return;
    }

    if (document.visibilityState === 'visible' && currentAdvert.value && !currentAdvertStartedAt.value) {
        currentAdvertStartedAt.value = new Date().toISOString();
    }
};

const handlePageHide = (): void => {
    flushCurrentAdvertView(true);
};

onMounted(async () => {
    await synchroniseLiveAdverts();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    scheduleRotation();
});

onBeforeUnmount(() => {
    isUnmounted = true;

    flushCurrentAdvertView(true);
    clearPollTimeout();
    activeLiveAdvertsRequestController?.abort();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
});
</script>

<template>
    <div
        data-testid="advert-block"
        class="relative flex h-full w-full items-end justify-center overflow-hidden"
    >
        <Transition
            enter-active-class="transition-opacity duration-1000"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-1000"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="currentAdvert"
                :key="currentAdvert.id"
                class="absolute inset-0 flex items-end justify-center"
            >
                <img
                    data-testid="advert-block-image"
                    :src="currentAdvert.src"
                    alt="Active advert"
                    class="h-full w-full object-contain"
                />
            </div>
        </Transition>
    </div>
</template>
