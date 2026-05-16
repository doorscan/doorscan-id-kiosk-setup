<script setup lang="ts">
import { ArrowRightStartOnRectangleIcon } from '@heroicons/vue/24/solid';
import { Link } from '@inertiajs/vue3';
import Logo from '@/components/Logo.vue';
import { logout } from '@/routes';
</script>

<template>
    <div class="mb-6 flex justify-between border-b-white px-4 pt-6">
        <Logo class="h-10" />
        <Link
            :href="logout()"
            as="button"
            class="rounded-full bg-red-600 p-2 text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
        >
            <ArrowRightStartOnRectangleIcon class="size-8" aria-hidden="true" />
        </Link>
    </div>
</template>
