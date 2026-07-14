# Codex project rules

These rules are persistent project requirements and apply in future Codex chats.

## Preserve editable art sources

- Never keep only the optimized files under `public/` for generated or edited character art.
- For every generated or edited image, preserve the untouched generator output, a full-resolution transparent/editable master, the runtime export, and the prompt/settings used to create it under `art-source/`.
- Keep `art-source/characters/runtime/` synchronized with `public/assets/characters/` whenever runtime character art changes.
- Update `art-source/characters/PROMPTS.md` and `README.md` when adding characters, changing frame layouts, or changing the regeneration process.
- Do not delete older source art unless the user explicitly requests it.

## Publish GitHub and the public game together

- The public game is deployed by `.github/workflows/deploy-pages.yml` from the `main` branch.
- When the user asks to publish or update GitHub, the task is not complete until the changes are on `main`, the GitHub Pages deployment succeeds, and the public URL is verified.
- Run `npm run build` before publishing.
- Preserve the GitHub Pages subpath behavior (`/muyue/`) when changing Vite or asset URLs.
- Report both the GitHub commit/PR and the verified public game URL after publishing.

