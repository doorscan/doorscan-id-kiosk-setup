import type { ComputedRef, InjectionKey, Ref } from 'vue';
import { inject } from 'vue';
import type { PinEntryDigitState, PinEntryRootSlotProps } from './types';

export const pinEntryKeyDigits = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '0',
] as const;

export type PinEntryContext = {
    appendDigit: (digit: string) => void;
    backspace: () => void;
    clear: () => void;
    digits: ComputedRef<PinEntryDigitState[]>;
    disabled: ComputedRef<boolean>;
    isComplete: ComputedRef<boolean>;
    isEmpty: ComputedRef<boolean>;
    keyDigits: readonly string[];
    length: ComputedRef<number>;
    masked: ComputedRef<boolean>;
    setValue: (value: string) => void;
    slotProps: ComputedRef<PinEntryRootSlotProps>;
    value: Ref<string>;
};

export const pinEntryContextKey: InjectionKey<PinEntryContext> =
    Symbol('pin-entry');

export function stateString(
    flags: Record<string, boolean>,
): string | undefined {
    const states = Object.entries(flags)
        .filter(([, active]) => active)
        .map(([key]) => key);

    return states.length > 0 ? states.join(' ') : undefined;
}

export function usePinEntryContext(component: string): PinEntryContext {
    const context = inject(pinEntryContextKey);

    if (!context) {
        throw new Error(`${component} must be used within PinEntryRoot.`);
    }

    return context;
}
