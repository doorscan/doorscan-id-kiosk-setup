<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';
import Logo from '@/components/Logo.vue';
import { PinEntry } from '@/components/pin-entry';
import { store } from '@/routes/login';

withDefaults(
    defineProps<{
        canRegister: boolean;
    }>(),
    {
        canRegister: true,
    },
);

const showLoginPad = ref(false);
const pin = ref('');
const form = useForm({
    auth_mode: 'pin_lookup',
    login: '',
    password: '',
    remember: true,
});

const errorMessage = computed(() => form.errors.login ?? form.errors.password);

const closePinPad = () => {
    pin.value = '';
    form.clearErrors();
    showLoginPad.value = false;
};

const pinInput = (completedPin: string) => {
    if (form.processing) {
        return;
    }

    form.clearErrors();
    form.login = completedPin;
    form.password = completedPin;
    form.submit(store(), {
        preserveScroll: true,
        onError: () => {
            pin.value = '';
        },
        onFinish: () => {
            form.login = '';
            form.password = '';
        },
    });
};

watch(pin, (value, previousValue) => {
    if (value.length > 0 && value !== previousValue && errorMessage.value) {
        form.clearErrors();
    }
});
</script>

<template>
    <Head title="Welcome">
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    </Head>
    <div
        class="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]"
    >
        <main
            class="flex w-full flex-1 flex-col items-center justify-center gap-16 opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0"
        >
            <div
                data-testid="welcome-logo-shell"
                :class="[
                    'transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none motion-reduce:transition-none',
                    showLoginPad
                        ? '-translate-y-8 sm:-translate-y-10'
                        : 'translate-y-0',
                ]"
            >
                <button type="button" @click="showLoginPad = true">
                    <Logo class="text-black dark:text-white h-24"/>
                </button>
            </div>

            <transition
                enter-active-class="transition duration-300 ease-out"
                enter-from-class="translate-y-2 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition duration-200 ease-in"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="translate-y-2 opacity-0"
            >
                <div
                    v-if="showLoginPad"
                    class="flex w-full max-w-sm flex-col items-center"
                >
                    <PinEntry
                        v-model="pin"
                        :length="6"
                        :masked="true"
                        :error="errorMessage"
                        :disabled="form.processing"
                        class="w-full rounded-[2rem] border border-zinc-200/80 bg-white/95 p-7 text-zinc-950 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/90 dark:text-white"
                        display-class="gap-5"
                        error-class="px-2"
                        slot-class="size-12 rounded-full border-zinc-300 bg-zinc-50 text-zinc-950 shadow-none data-[filled]:border-zinc-950 data-[filled]:bg-zinc-950 data-[filled]:text-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:data-[filled]:border-white dark:data-[filled]:bg-white dark:data-[filled]:text-zinc-950"
                        pad-class="max-w-[18rem] gap-4"
                        key-class="h-16 rounded-full border-green-200 bg-zinc-50 text-xl font-semibold text-zinc-950 shadow-none hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                        action-class="h-16 rounded-full border-zinc-200 bg-zinc-100 text-zinc-600 shadow-none hover:bg-zinc-200 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                        @clear="closePinPad"
                        @complete="pinInput"
                    />
                </div>
            </transition>
        </main>
    </div>
</template>
