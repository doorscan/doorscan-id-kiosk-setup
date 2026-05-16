import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

const ignoredHotReloadPaths = [
    '**/.agents/**',
    '**/.ai/**',
    '**/.claude/**',
    '**/.codex/**',
    '**/.junie/**',
    '**/AGENTS.md',
    '**/CLAUDE.md',
];

const fullReloadPaths = [
    'app/Livewire/**',
    'app/View/Components/**',
    'lang/**',
    'resources/lang/**',
    'resources/views/**',
];

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: [
                {
                    paths: fullReloadPaths,
                },
                {
                    paths: ['routes/**'],
                    config: {
                        // Give Wayfinder time to regenerate route and action files first.
                        delay: 1500,
                    },
                },
            ],
        }),
        inertia(),
        tailwindcss(),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        wayfinder({
            formVariants: true,
        }),
    ],
    server: {
        watch: {
            ignored: ignoredHotReloadPaths,
        },
    },
});
