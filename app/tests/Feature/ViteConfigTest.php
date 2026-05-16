<?php

test('vite ignores agent metadata paths during development', function () {
    $viteConfig = file_get_contents(base_path('vite.config.ts'));

    expect($viteConfig)
        ->toContain('ignoredHotReloadPaths')
        ->toContain("'**/.agents/**'")
        ->toContain("'**/.ai/**'")
        ->toContain("'**/.claude/**'")
        ->toContain("'**/.codex/**'")
        ->toContain("'**/.junie/**'")
        ->toContain("'**/AGENTS.md'")
        ->toContain("'**/CLAUDE.md'")
        ->toContain('server:')
        ->toContain('watch:')
        ->toContain('ignored: ignoredHotReloadPaths');
});
