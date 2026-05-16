import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import {
    PinEntry,
    PinEntryAction,
    PinEntryDisplay,
    PinEntryKey,
    PinEntryPad,
    PinEntryRoot,
    PinEntrySlot,
} from '@/components/pin-entry';

const HeadlessPinFixture = defineComponent({
    components: {
        PinEntryAction,
        PinEntryDisplay,
        PinEntryKey,
        PinEntryPad,
        PinEntryRoot,
        PinEntrySlot,
    },
    props: {
        defaultValue: {
            type: String,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        length: {
            type: Number,
            default: 4,
        },
        masked: {
            type: Boolean,
            default: true,
        },
    },
    emits: ['back', 'complete', 'reset', 'update:modelValue'],
    setup(props, { emit }) {
        const currentValue = ref('');

        return {
            currentValue,
            emit,
            props,
        };
    },
    template: `
        <PinEntryRoot
            v-model="currentValue"
            :default-value="props.defaultValue"
            :disabled="props.disabled"
            :length="props.length"
            :masked="props.masked"
            as="section"
            class="fixture-root"
            @back="emit('back')"
            @complete="emit('complete', $event)"
            @reset="emit('reset')"
            @update:model-value="emit('update:modelValue', $event)"
        >
            <template #default="{ digits, isComplete, value }">
                <PinEntryDisplay class="fixture-display">
                    <template #default="{ enteredLength }">
                        <span data-testid="entered-length">{{ enteredLength }}</span>
                        <span data-testid="complete-flag">{{ isComplete }}</span>
                        <span data-testid="current-value">{{ value }}</span>
                        <PinEntrySlot
                            v-for="digit in digits"
                            :key="digit.index"
                            :index="digit.index"
                            class="fixture-slot"
                        >
                            <template #default="{ displayValue, filled }">
                                <span data-testid="slot-value">{{ filled ? displayValue : '-' }}</span>
                            </template>
                        </PinEntrySlot>
                    </template>
                </PinEntryDisplay>

                <PinEntryPad class="fixture-pad">
                    <template #default="{ keyDigits }">
                        <PinEntryKey
                            v-for="digit in keyDigits"
                            :key="digit"
                            :digit="digit"
                            class="fixture-key"
                        />
                        <PinEntryAction action="clear" class="fixture-clear">
                            Clear all
                        </PinEntryAction>
                        <PinEntryAction action="back" class="fixture-back">
                            Back one
                        </PinEntryAction>
                    </template>
                </PinEntryPad>
            </template>
        </PinEntryRoot>
    `,
});

const UncontrolledPinFixture = defineComponent({
    components: {
        PinEntryDisplay,
        PinEntryRoot,
        PinEntrySlot,
    },
    props: {
        defaultValue: {
            type: String,
            default: '',
        },
        masked: {
            type: Boolean,
            default: true,
        },
    },
    template: `
        <PinEntryRoot
            :default-value="defaultValue"
            :masked="masked"
            :length="4"
        >
            <PinEntryDisplay>
                <template #default="{ enteredLength }">
                    <span data-testid="entered-length">{{ enteredLength }}</span>
                    <PinEntrySlot
                        v-for="index in 4"
                        :key="index"
                        :index="index - 1"
                    >
                        <template #default="{ displayValue, filled }">
                            <span data-testid="slot-value">{{ filled ? displayValue : '-' }}</span>
                        </template>
                    </PinEntrySlot>
                </template>
            </PinEntryDisplay>
        </PinEntryRoot>
    `,
});

describe('PinEntry', () => {
    it('keeps the convenience wrapper usable with keypad entry', async () => {
        const wrapper = mount(PinEntry, {
            props: {
                length: 4,
                masked: false,
            },
        });

        for (const digit of ['1', '2', '3', '4', '5']) {
            await wrapper
                .get(`[data-slot="pin-entry-key"][data-digit="${digit}"]`)
                .trigger('click');
        }

        expect(wrapper.emitted('update:modelValue')).toEqual([
            ['1'],
            ['12'],
            ['123'],
            ['1234'],
        ]);

        const slotTexts = wrapper
            .findAll('[data-slot="pin-entry-slot"]')
            .map((slot) => slot.text());
        expect(slotTexts).toEqual(['1', '2', '3', '4']);
    });

    it('emits clear and backspace from the convenience wrapper', async () => {
        const wrapper = mount(PinEntry, {
            props: {
                length: 4,
                masked: false,
            },
        });

        for (const digit of ['1', '2']) {
            await wrapper
                .get(`[data-slot="pin-entry-key"][data-digit="${digit}"]`)
                .trigger('click');
        }

        await wrapper
            .get('[data-slot="pin-entry-action"][data-action="back"]')
            .trigger('click');
        await wrapper
            .get('[data-slot="pin-entry-action"][data-action="clear"]')
            .trigger('click');

        expect(wrapper.emitted('back')).toHaveLength(1);
        expect(wrapper.emitted('backspace')).toHaveLength(1);
        expect(wrapper.emitted('reset')).toHaveLength(1);
        expect(wrapper.emitted('clear')).toHaveLength(1);
    });

    it('applies wrapper class overrides to internal parts', () => {
        const wrapper = mount(PinEntry, {
            props: {
                actionClass: 'action-override',
                displayClass: 'display-override',
                error: 'Incorrect PIN',
                errorClass: 'error-override',
                keyClass: 'key-override',
                padClass: 'pad-override',
                slotClass: 'slot-override',
            },
        });

        expect(
            wrapper.get('[data-slot="pin-entry-display"]').classes(),
        ).toContain('display-override');
        expect(wrapper.get('[data-slot="pin-entry-pad"]').classes()).toContain(
            'pad-override',
        );
        expect(
            wrapper
                .get('[data-slot="pin-entry-slot"][data-index="0"]')
                .classes(),
        ).toContain('slot-override');
        expect(
            wrapper
                .get('[data-slot="pin-entry-key"][data-digit="1"]')
                .classes(),
        ).toContain('key-override');
        expect(
            wrapper
                .get('[data-slot="pin-entry-action"][data-action="clear"]')
                .classes(),
        ).toContain('action-override');
        expect(wrapper.get('[data-slot="pin-entry-error"]').classes()).toContain(
            'error-override',
        );
    });

    it('renders wrapper error content between the display and keypad', () => {
        const wrapper = mount(PinEntry, {
            props: {
                error: 'Incorrect PIN',
            },
        });

        const root = wrapper.get('[data-slot="pin-entry-root"]');
        const display = root.get('[data-slot="pin-entry-display"]');
        const error = root.get('[data-slot="pin-entry-error"]');
        const pad = root.get('[data-slot="pin-entry-pad"]');
        const childElements = Array.from(root.element.children);

        expect(error.text()).toBe('Incorrect PIN');
        expect(childElements.indexOf(display.element)).toBeLessThan(
            childElements.indexOf(error.element),
        );
        expect(childElements.indexOf(error.element)).toBeLessThan(
            childElements.indexOf(pad.element),
        );
    });

    it('supports masked and visible headless slot rendering', async () => {
        const maskedWrapper = mount(HeadlessPinFixture, {
            props: {
                masked: true,
            },
        });

        await maskedWrapper
            .get('[data-slot="pin-entry-key"][data-digit="1"]')
            .trigger('click');
        await maskedWrapper
            .get('[data-slot="pin-entry-key"][data-digit="2"]')
            .trigger('click');

        expect(
            maskedWrapper
                .findAll('[data-testid="slot-value"]')
                .map((node) => node.text()),
        ).toEqual(['•', '•', '-', '-']);

        const visibleWrapper = mount(HeadlessPinFixture, {
            props: {
                masked: false,
            },
        });

        await visibleWrapper
            .get('[data-slot="pin-entry-key"][data-digit="1"]')
            .trigger('click');
        await visibleWrapper
            .get('[data-slot="pin-entry-key"][data-digit="2"]')
            .trigger('click');

        expect(
            visibleWrapper
                .findAll('[data-testid="slot-value"]')
                .map((node) => node.text()),
        ).toEqual(['1', '2', '-', '-']);
    });

    it('emits reset and back from headless actions', async () => {
        const wrapper = mount(HeadlessPinFixture, {
            props: {
                masked: false,
            },
        });

        for (const digit of ['1', '2', '3']) {
            await wrapper
                .get(`[data-slot="pin-entry-key"][data-digit="${digit}"]`)
                .trigger('click');
        }

        await wrapper
            .get('[data-slot="pin-entry-action"][data-action="back"]')
            .trigger('click');
        expect(wrapper.emitted('back')).toHaveLength(1);
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['12']);

        await wrapper
            .get('[data-slot="pin-entry-action"][data-action="clear"]')
            .trigger('click');
        expect(wrapper.emitted('reset')).toHaveLength(1);
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    });

    it('blocks keypad and keyboard interaction when disabled', async () => {
        const wrapper = mount(HeadlessPinFixture, {
            props: {
                disabled: true,
                masked: false,
            },
        });

        await wrapper
            .get('[data-slot="pin-entry-key"][data-digit="1"]')
            .trigger('click');
        await wrapper
            .get('[data-slot="pin-entry-action"][data-action="clear"]')
            .trigger('click');
        await wrapper
            .get('[data-slot="pin-entry-root"]')
            .trigger('keydown', { key: '2' });

        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
        expect(
            wrapper
                .get('[data-slot="pin-entry-root"]')
                .attributes('data-disabled'),
        ).toBe('true');
        expect(
            wrapper
                .get('[data-slot="pin-entry-key"][data-digit="1"]')
                .attributes('data-disabled'),
        ).toBe('true');
    });

    it('supports keyboard entry, root slot props, and complete events once per fill', async () => {
        const wrapper = mount(HeadlessPinFixture, {
            props: {
                masked: false,
            },
        });

        const root = wrapper.get('[data-slot="pin-entry-root"]');

        await root.trigger('keydown', { key: '1' });
        await root.trigger('keydown', { key: '2' });
        await root.trigger('keydown', { key: '3' });
        await root.trigger('keydown', { key: '4' });
        await root.trigger('keydown', { key: '5' });

        expect(wrapper.emitted('complete')).toEqual([['1234']]);
        expect(
            wrapper
                .get('[data-slot="pin-entry-root"]')
                .attributes('data-complete'),
        ).toBe('true');
        expect(wrapper.get('[data-testid="complete-flag"]').text()).toBe(
            'true',
        );
        expect(wrapper.get('[data-testid="current-value"]').text()).toBe(
            '1234',
        );

        await root.trigger('keydown', { key: 'Backspace' });
        await root.trigger('keydown', { key: '4' });

        expect(wrapper.emitted('complete')).toEqual([['1234'], ['1234']]);
        expect(wrapper.emitted('back')).toHaveLength(1);
    });

    it('supports uncontrolled defaultValue', async () => {
        const wrapper = mount(UncontrolledPinFixture, {
            props: {
                defaultValue: '9a8',
                masked: false,
            },
        });

        expect(
            wrapper
                .findAll('[data-testid="slot-value"]')
                .map((node) => node.text()),
        ).toEqual(['9', '8', '-', '-']);
        expect(wrapper.get('[data-testid="entered-length"]').text()).toBe('2');
    });
});
