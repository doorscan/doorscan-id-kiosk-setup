import { mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import Welcome from '@/pages/Welcome.vue';

vi.mock('@inertiajs/vue3', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@inertiajs/vue3')>();

    return {
        ...actual,
        Head: defineComponent({
            name: 'Head',
            template: '<div><slot /></div>',
        }),
        useForm: vi.fn((defaults: Record<string, unknown>) => {
            const errors = reactive<Record<string, string>>({});

            return reactive({
                ...defaults,
                errors,
                processing: false,
                clearErrors: () => {
                    for (const key of Object.keys(errors)) {
                        delete errors[key];
                    }
                },
                submit: (
                    _route: unknown,
                    options?: {
                        onError?: (errors: Record<string, string>) => void;
                        onFinish?: () => void;
                    },
                ) => {
                    errors.login = 'The provided PIN is incorrect.';
                    options?.onError?.(errors);
                    options?.onFinish?.();
                },
            });
        }),
    };
});

describe('Welcome page PIN entry', () => {
    it('clears the PIN and closes the pad when the clear button is pressed', async () => {
        const wrapper = mount(Welcome, {
            props: {
                canRegister: true,
            },
            global: {
                stubs: {
                    Logo: {
                        template: '<div>Logo</div>',
                    },
                },
            },
        });

        const buttons = () => wrapper.findAll('button');
        const findButtonByText = (text: string) => {
            const button = buttons().find(
                (candidate) => candidate.text().trim() === text,
            );

            expect(button).toBeDefined();

            return button!;
        };

        await buttons()[0]!.trigger('click');
        await findButtonByText('1').trigger('click');
        await findButtonByText('2').trigger('click');

        expect(
            wrapper.get('[data-testid="welcome-logo-shell"]').classes(),
        ).toContain('-translate-y-8');
        expect(wrapper.find('[data-slot="pin-entry-root"]').exists()).toBe(
            true,
        );

        await wrapper.get('button[aria-label="Clear PIN"]').trigger('click');

        expect(wrapper.find('[data-slot="pin-entry-root"]').exists()).toBe(
            false,
        );
        expect(wrapper.text()).not.toContain('12');

        await buttons()[0]!.trigger('click');

        expect(
            wrapper
                .findAll('[data-slot="pin-entry-slot"]')
                .every((slot) => slot.attributes('data-empty') === 'true'),
        ).toBe(true);
    });

    it('shows a failed login error until the next PIN attempt starts', async () => {
        const wrapper = mount(Welcome, {
            props: {
                canRegister: true,
            },
            global: {
                stubs: {
                    Logo: {
                        template: '<div>Logo</div>',
                    },
                },
            },
        });

        await wrapper.get('button').trigger('click');
        await wrapper
            .getComponent({ name: 'PinEntry' })
            .vm.$emit('complete', '123456');

        const error = wrapper.get('p.text-red-600');

        expect(error.text()).toBe('The provided PIN is incorrect.');
        expect(error.classes()).toContain('font-semibold');

        await wrapper.get('[data-slot="pin-entry-key"][data-digit="1"]').trigger('click');

        expect(wrapper.find('p.text-red-600').exists()).toBe(false);
    });
});
