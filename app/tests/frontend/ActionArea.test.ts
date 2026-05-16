import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ActionArea from '@/components/ActionArea.vue';

describe('ActionArea', () => {
    it('renders the default active scan button state', () => {
        const wrapper = mount(ActionArea);
        const scanButton = wrapper.get('[data-testid="scan-button"]');
        const manualEntryButton = wrapper.get('[data-testid="manual-entry-button"]');

        expect(scanButton.attributes('disabled')).toBeUndefined();
        expect(scanButton.classes()).toContain('bg-green-600');
        expect(scanButton.classes()).toContain('text-7xl');
        expect(scanButton.classes()).toContain('w-3/4');
        expect(scanButton.text()).toBe('scan');
        expect(
            wrapper.find('[data-testid="scan-spinner-left"]').exists(),
        ).toBe(false);
        expect(
            wrapper.find('[data-testid="scan-spinner-right"]').exists(),
        ).toBe(false);
        expect(manualEntryButton.attributes('disabled')).toBeUndefined();
        expect(manualEntryButton.classes()).toContain('flex-1');
        expect(manualEntryButton.classes()).toContain('translate-x-0');
    });

    it('renders the disabled in-progress scan button state', () => {
        const wrapper = mount(ActionArea, {
            props: {
                inProgress: true,
            },
        });
        const scanButton = wrapper.get('[data-testid="scan-button"]');
        const manualEntryButton = wrapper.get('[data-testid="manual-entry-button"]');

        expect(scanButton.attributes('disabled')).toBeDefined();
        expect(scanButton.classes()).toContain('bg-indigo-600');
        expect(scanButton.classes()).toContain('text-7xl');
        expect(scanButton.classes()).toContain('w-full');
        expect(scanButton.classes()).not.toContain('bg-green-600');
        expect(scanButton.text()).toBe('Scan in progress');
        expect(
            wrapper.find('[data-testid="scan-spinner-left"]').exists(),
        ).toBe(true);
        expect(
            wrapper.find('[data-testid="scan-spinner-right"]').exists(),
        ).toBe(true);
        expect(manualEntryButton.attributes('disabled')).toBeDefined();
        expect(manualEntryButton.classes()).toContain('max-w-0');
        expect(manualEntryButton.classes()).toContain(
            'translate-x-[calc(100%+1.5rem)]',
        );
        expect(manualEntryButton.classes()).toContain('pointer-events-none');
    });
});
