# Copilot instructions for DibblerEscape

## Git workflow
- `master` is production. Never commit feature work directly to `master`.
- Start every new feature, fix or change on its own branch (e.g. `feature/<short-name>`, `fix/<short-name>`) created from an up-to-date `master`.
- Commit and push the feature branch to `origin` as you go.
- When a branch is merged into `master`, push `master` to `origin` right after the merge.
- Include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer in commits.

## Project
- Plain browser game: `index.html` + ES modules in `js/` (no build step). Canvas 2D rendering.
- Tests: `node --test tests/`.
- Keep controls documented in `README.md`; every hotkey needs an on-screen hint and a touch equivalent where relevant.
