<script setup lang="ts">
import Header from '@/components/Header.vue';
import type { AdvertDisplay } from '@/lib/adverts';
import AdvertBlock from '@/layouts/AdvertBlock.vue';

withDefaults(
    defineProps<{
        initialAdvert?: AdvertDisplay | null;
    }>(),
    {
        initialAdvert: null,
    },
);
</script>

<template>
    <div class="h-screen">
        <Header />

        <div class="flex h-full flex-col">
            <div class="h-1/2 px-4">
                <slot></slot>
            </div>
            <div class="flex h-1/2 items-end justify-center select-none">
                <AdvertBlock :initial-advert="initialAdvert" />
            </div>
        </div>
    </div>
</template>
