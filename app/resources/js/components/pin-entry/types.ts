import type { Component, HTMLAttributes } from 'vue';

export type PinEntryAs = string | Component;

export type PinEntryActionType = 'back' | 'clear';

export type PinEntryDigitState = {
    index: number;
    value: string;
    displayValue: string;
    empty: boolean;
    filled: boolean;
    masked: boolean;
};

export type PinEntryRootSlotProps = {
    appendDigit: (digit: string) => void;
    backspace: () => void;
    clear: () => void;
    digits: PinEntryDigitState[];
    disabled: boolean;
    isComplete: boolean;
    isEmpty: boolean;
    length: number;
    masked: boolean;
    setValue: (value: string) => void;
    value: string;
};

export type PinEntryDisplaySlotProps = Omit<
    PinEntryRootSlotProps,
    'appendDigit' | 'backspace' | 'clear' | 'setValue' | 'value'
> & {
    enteredLength: number;
};

export type PinEntrySlotSlotProps = PinEntryDigitState & {
    disabled: boolean;
    index: number;
    isComplete: boolean;
};

export type PinEntryPadSlotProps = Pick<
    PinEntryRootSlotProps,
    'appendDigit' | 'backspace' | 'clear' | 'digits' | 'disabled' | 'isComplete'
> & {
    keyDigits: string[];
};

export type PinEntryKeySlotProps = {
    digit: string;
    disabled: boolean;
    press: () => void;
};

export type PinEntryActionSlotProps = {
    action: PinEntryActionType;
    disabled: boolean;
    press: () => void;
};

export interface PinEntryRootProps {
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
    defaultValue?: string;
    disabled?: boolean;
    length?: number;
    masked?: boolean;
    modelValue?: string;
}

export interface PinEntryProps extends PinEntryRootProps {
    actionClass?: HTMLAttributes['class'];
    displayClass?: HTMLAttributes['class'];
    error?: string;
    errorClass?: HTMLAttributes['class'];
    keyClass?: HTMLAttributes['class'];
    padClass?: HTMLAttributes['class'];
    slotClass?: HTMLAttributes['class'];
}

export interface PinEntryDisplayProps {
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
}

export interface PinEntrySlotProps {
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
    index: number;
}

export interface PinEntryPadProps {
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
}

export interface PinEntryKeyProps {
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
    digit: string;
    disabled?: boolean;
}

export interface PinEntryActionProps {
    action: PinEntryActionType;
    as?: PinEntryAs;
    class?: HTMLAttributes['class'];
    disabled?: boolean;
}
