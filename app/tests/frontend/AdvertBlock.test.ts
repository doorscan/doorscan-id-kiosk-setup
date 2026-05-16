import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdvertBlock from '@/layouts/AdvertBlock.vue';

const { liveAdvertsRoute, storeAdvertViewRoute } = vi.hoisted(() => ({
    liveAdvertsRoute: Object.assign(vi.fn(), {
        url: vi.fn(() => '/adverts/live'),
    }),
    storeAdvertViewRoute: Object.assign(vi.fn(), {
        url: vi.fn(() => '/adverts/views'),
    }),
}));

vi.mock('@/actions/App/Http/Controllers/LiveAdvertsController', () => ({
    default: liveAdvertsRoute,
}));

vi.mock('@/actions/App/Http/Controllers/StoreAdvertViewController', () => ({
    default: storeAdvertViewRoute,
}));

describe('AdvertBlock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-20T20:00:00.000Z'));
        document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-value">';
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.head.innerHTML = '';
    });

    it('starts on the second advert when the first live advert matches the initial advert and records the outgoing view', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockImplementation(
            async (input, init) => {
                const url = typeof input === 'string' ? input : input.url;

                if (url === '/adverts/live') {
                    return {
                        json: async () => ({
                            adverts: [
                                { id: 1, src: '/storage/initial-screen.jpg' },
                                { id: 2, src: '/storage/next-screen.jpg' },
                            ],
                            advert_display_time_in_seconds: 60,
                        }),
                        ok: true,
                    } as Response;
                }

                if (url === '/adverts/views') {
                    return {
                        json: async () => ({}),
                        ok: true,
                    } as Response;
                }

                throw new Error(`Unexpected fetch to ${url} (${init?.method ?? 'GET'})`);
            },
        );

        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(AdvertBlock, {
            props: {
                initialAdvert: {
                    id: 1,
                    src: '/storage/initial-screen.jpg',
                },
            },
        });

        await flushPromises();

        expect(wrapper.get('[data-testid="advert-block-image"]').attributes('src')).toBe(
            '/storage/initial-screen.jpg',
        );

        await vi.advanceTimersByTimeAsync(60_000);
        await flushPromises();

        expect(wrapper.get('[data-testid="advert-block-image"]').attributes('src')).toBe(
            '/storage/next-screen.jpg',
        );
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            '/adverts/views',
            expect.objectContaining({
                body: JSON.stringify({
                    advert_id: 1,
                    displayed_seconds: 60,
                    ended_at: '2026-04-20T20:01:00.000Z',
                    started_at: '2026-04-20T20:00:00.000Z',
                }),
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': 'csrf-token-value',
                }),
                keepalive: true,
                method: 'POST',
            }),
        );
    });

    it('stays empty initially when no initial advert is provided, then shows the first live advert after the first interval', async () => {
        const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
            const url = typeof input === 'string' ? input : input.url;

            if (url === '/adverts/live') {
                return {
                    json: async () => ({
                        adverts: [{ id: 3, src: '/storage/live-screen.jpg' }],
                        advert_display_time_in_seconds: 60,
                    }),
                    ok: true,
                } as Response;
            }

            throw new Error(`Unexpected fetch to ${url}`);
        });

        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(AdvertBlock);

        await flushPromises();

        expect(wrapper.find('[data-testid="advert-block-image"]').exists()).toBe(false);

        await vi.advanceTimersByTimeAsync(60_000);
        await flushPromises();

        expect(wrapper.get('[data-testid="advert-block-image"]').attributes('src')).toBe(
            '/storage/live-screen.jpg',
        );
    });

    it('does not rotate when only one advert remains active and flushes the final view asynchronously on unmount', async () => {
        const sendBeacon = vi.fn(() => true);
        const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
            const url = typeof input === 'string' ? input : input.url;

            if (url === '/adverts/live') {
                return {
                    json: async () => ({
                        adverts: [{ id: 4, src: '/storage/only-screen.jpg' }],
                        advert_display_time_in_seconds: 60,
                    }),
                    ok: true,
                } as Response;
            }

            throw new Error(`Unexpected fetch to ${url}`);
        });

        vi.stubGlobal('fetch', fetchMock);
        vi.stubGlobal('navigator', {
            ...navigator,
            sendBeacon,
        });

        const wrapper = mount(AdvertBlock, {
            props: {
                initialAdvert: {
                    id: 4,
                    src: '/storage/only-screen.jpg',
                },
            },
        });

        await flushPromises();
        await vi.advanceTimersByTimeAsync(120_000);
        await flushPromises();

        expect(wrapper.get('[data-testid="advert-block-image"]').attributes('src')).toBe(
            '/storage/only-screen.jpg',
        );

        wrapper.unmount();

        expect(sendBeacon).toHaveBeenCalledTimes(1);

        const [, formData] = sendBeacon.mock.calls[0]!;

        expect(formData).toBeInstanceOf(FormData);
        expect((formData as FormData).get('advert_id')).toBe('4');
        expect((formData as FormData).get('displayed_seconds')).toBe('120');
        expect((formData as FormData).get('started_at')).toBe('2026-04-20T20:00:00.000Z');
        expect((formData as FormData).get('_token')).toBe('csrf-token-value');
    });
});
