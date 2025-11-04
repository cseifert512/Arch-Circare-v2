<!-- 326df536-895b-44d1-8cd5-c96530df3958 e81f2f70-d579-4770-9cb6-79572091a38c -->
# Archipedia Frontend Scaffold + Intro Page

## Goals (this phase)

- Create a new Git branch for the work.
- Establish routes and persistent header.
- Implement Intro/Landing page with NL search, image upload, and sample queries.
- Defer Results and Project pages (stub routes only).
- Use design tokens (CSS variables) to match Figma. No backend calls yet.

## References

- Repo and scripts: [GitHub repository](https://github.com/danielguerrarmz-create/Archipediadesignsystemfrontend)
- Setup note: see [README](https://github.com/danielguerrarmz-create/Archipediadesignsystemfrontend/blob/main/README.md)

## Branch & Dependencies

- Create branch: `feature/frontend-scaffold-intro`
- Add dependency: `react-router-dom`

## File/Dir structure

- `src/main.tsx` — bootstraps app, routing, global styles
- `src/theme/tokens.ts` — JS/TS token map from Figma
- `src/theme/global.css` — CSS variables mapped from tokens; base resets
- `src/components/Header/Header.tsx` — persistent header with right-aligned nav (About, How it works)
- `src/components/SearchBar/SearchBar.tsx` — text input + image upload
- `src/routes/IntroPage.tsx` — hero with SearchBar and sample queries
- `src/routes/SearchPage.tsx` — placeholder only (no implementation yet)
- `src/routes/ProjectPage.tsx` — placeholder only (no implementation yet)
- `src/routes/AboutPage.tsx`, `src/routes/HowItWorksPage.tsx` — minimal placeholders

## Key implementation notes

- Tokens: define color, spacing, radii, typography scales; expose as CSS variables in `:root`.
- Accessibility: label search input, image input; keyboard focus styles via tokens.
- URL-state: Intro page navigates to `/search` with `?q=...` and sets a `hasImage` param if an image was selected (no upload yet).
- No backend: do not call any API in this phase; leave results empty and show placeholders on `/search`.

## Minimal snippets (essential only)

- `src/main.tsx` routing skeleton (Header + routes)
- `src/components/Header/Header.tsx` structure
- `src/components/SearchBar/SearchBar.tsx` with text+image submit
- `src/routes/IntroPage.tsx` integrating SearchBar and sample chips

## Git commands (for later execution)

- Create and push branch:
- `git checkout -b feature/frontend-scaffold-intro`
- `git push -u origin feature/frontend-scaffold-intro`
- Install router:
- `npm i react-router-dom`

## Out of scope (future phases)

- Results page UI/logic (tri-weight control, filters, grid)
- Project detail page
- Real search and image upload API integration

### To-dos

- [ ] Create branch feature/frontend-scaffold-intro and push to origin
- [ ] Add react-router-dom dependency
- [ ] Create tokens.ts and global.css from Figma palette/typography
- [ ] Add main.tsx with Router and persistent Header
- [ ] Build Header with right-aligned About and How it works
- [ ] Build SearchBar with NL text and image upload
- [ ] Implement IntroPage with SearchBar and sample queries
- [ ] Add placeholders for Search, Project, About, How it works
- [ ] Run dev, verify visuals, commit changes


