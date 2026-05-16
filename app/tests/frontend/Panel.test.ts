import { mount } from '@vue/test-utils';
import { defineComponent, onMounted } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import Panel from '@/components/Panel.vue';

describe('Panel', () => {
    it('shows the default awaiting text without unmounting the slot content', async () => {
        const mountedSpy = vi.fn();

        const SlotProbe = defineComponent({
            setup() {
                onMounted(() => {
                    mountedSpy();
                });

                return {};
            },
            template: '<div data-testid="slot-probe">Panel body</div>',
        });

        const wrapper = mount(Panel, {
            props: {
                awaiting: true,
            },
            slots: {
                default: SlotProbe,
            },
        });

        expect(mountedSpy).toHaveBeenCalledTimes(1);
        expect(wrapper.get('[data-testid="panel-awaiting"]').text()).toContain(
            'Awaiting Scan',
        );
        expect(wrapper.get('[data-testid="slot-probe"]').exists()).toBe(true);
        expect(wrapper.get('[data-testid="slot-probe"]').text()).toBe(
            'Panel body',
        );
        expect(wrapper.text()).toContain('Panel body');
        expect(wrapper.attributes('data-awaiting')).toBe('true');

        await wrapper.setProps({ awaiting: false });

        expect(mountedSpy).toHaveBeenCalledTimes(1);
        expect(wrapper.find('[data-testid="panel-awaiting"]').exists()).toBe(
            false,
        );
        expect(wrapper.text()).toContain('Panel body');
        expect(wrapper.text()).not.toContain('Awaiting Scan');
        expect(wrapper.attributes('data-awaiting')).toBeUndefined();
    });

    it('allows the awaiting text to be overridden', () => {
        const wrapper = mount(Panel, {
            props: {
                awaiting: true,
                awaitingText: 'Waiting for document',
            },
        });

        expect(wrapper.text()).toContain('Waiting for document');
    });
});
