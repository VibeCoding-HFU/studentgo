# Agent Guide

This project is an Expo React Native app using TypeScript, Expo Router, React 19, and the `@/` path alias. Follow these practices when adding or changing code.
<!-- Why: This guide gives every human and AI assistant the same baseline for making framework-compatible, team-friendly changes. -->

## Project Shape
<!-- Why: This section explains where different kinds of code belong so future changes follow the existing Expo Router project structure. -->

- Put route screens and layouts in `app/`; this app uses Expo Router file-based routing.
- Put shared reusable UI in `components/`.
- Put reusable hooks in `hooks/`.
- Put design tokens, theme values, and constants in `constants/`.
- Put product features in `src/features/<feature-name>/`.
- Put cross-feature frontend helpers in `src/shared/`.
- Prefer imports through the configured `@/` alias for project files.

## Modular Platform Architecture
<!-- Why: StudentGo should grow as a small core platform with independent frontend modules, instead of becoming a tightly coupled app where every feature reaches into every other feature. -->

- Treat the core app as the platform shell: routing, navigation, theming, shared primitives, authentication/session state, permissions, telemetry, and cross-module composition belong in core areas such as `app/`, `components/`, `hooks/`, and `constants/`.
- Put new product features in `src/features/<feature-name>/` instead of scattering feature code across shared folders.
- Keep `app/` route files thin. A route should compose module screens and platform layout; feature behavior should live inside the owning module.
- A module should own its UI, hooks, types, API functions, validation, and local helpers. Use names such as `src/features/<feature-name>/components`, `src/features/<feature-name>/hooks`, `src/features/<feature-name>/api.ts`, and `src/features/<feature-name>/types.ts` when the module needs them.
- Modules may import from the platform core and shared primitives, but modules should not import internal files from other modules. If one module needs another module's capability, expose a small public API from that module first.
- Add or update a module entry file, such as `src/features/<feature-name>/index.ts`, for exports that are intentionally public. Keep internal implementation files private by convention.
- Avoid building large cross-module utility folders. Promote code into shared/core only after at least two modules need it and the shared abstraction is stable.
- Keep module state local by default. Shared state belongs in the platform core only when it truly coordinates multiple modules.
- Prefer feature flags, configuration, or registry-style composition for optional modules so the platform can enable modules gradually.
- When implementing a new feature, first decide whether it is platform/core behavior or a module. Default to a module unless it is needed by the whole app.

## Backend And Prisma
<!-- Why: The frontend should stay modular and backend-agnostic while the backend/data layer can be implemented with Prisma without leaking database concerns into screens. -->

- Use Prisma only on the backend/server side. Do not import Prisma clients, database models, or database access code directly into Expo route screens or React Native components.
- Frontend modules should talk to backend capabilities through typed API clients owned by the module, for example `src/features/<feature-name>/api.ts`, preferably built on `src/shared/api/client.ts`.
- Keep backend data contracts typed at the boundary. Map Prisma/database shapes into frontend-facing DTOs or domain types before they reach UI components.
- Keep Prisma schema, migrations, seeds, generated clients, and database-specific helpers in backend-owned folders. Do not mix database files into frontend feature UI folders.
- Keep module APIs stable and narrow. A backend change should usually require edits only in the owning module's service/type layer, not across unrelated screens.
- Backend modules live in `backend/src/modules/<module-name>/` and should follow the route/service/repository pattern: routes handle HTTP wiring, services handle business workflows, and repositories own Prisma access.
- Use `backend/src/modules/<module-name>/<module-name>.schemas.ts` for request parsing/validation when a module has more than trivial input handling.

## React Best Practices
<!-- Why: This section keeps React code predictable, readable, and maintainable as the app grows. -->

- Use function components and hooks. Do not introduce class components.
- Keep components small, focused, and named after the UI or behavior they own.
- Prefer composition over large prop-driven components with many conditional branches.
- Keep render logic pure. Do not trigger side effects during render.
- Store the minimum state needed. Derive values from props or state instead of duplicating them.
- Keep state as close as possible to the component that uses it. Introduce shared state only when multiple screens or components truly need it.
- Use stable keys for lists. Do not use array indexes as keys when items can be reordered, inserted, or deleted.
- Use `useMemo` and `useCallback` only when they avoid meaningful recalculation or prevent expensive child renders.
- Avoid deeply nested JSX. Extract well-named subcomponents when a render function becomes hard to scan.
- Keep hook dependencies correct. Do not suppress hook dependency lint warnings unless there is a clear reason documented in code.
- Clean up subscriptions, timers, and async work started from effects.

## TypeScript
<!-- Why: This section preserves strict type safety while keeping type annotations useful rather than noisy. -->

- Keep TypeScript strict. Prefer explicit prop types for exported components.
- Use `type` for component props and simple data shapes unless an interface is already the local pattern.
- Avoid `any`. Use `unknown`, generics, discriminated unions, or narrower domain types instead.
- Keep route params, API data, and navigation-facing data typed at the boundary.
- Let TypeScript infer local variables when the inferred type is obvious.

## Expo And React Native
<!-- Why: This section keeps implementation choices compatible with Expo, React Native, native platforms, and web. -->

- Use Expo Router primitives for navigation and layout instead of manually wiring navigation stacks unless there is a project-level reason.
- Use React Native components and APIs instead of web-only DOM APIs.
- Use `Platform.select` for platform-specific behavior and keep platform differences small.
- Prefer `expo-image` for images when it fits the use case.
- Use `FlatList` or `SectionList` for long or dynamic lists.
- Respect safe areas, keyboard behavior, and small screens when building screens.

## Styling And UI
<!-- Why: This section keeps the interface consistent, theme-aware, and usable across devices. -->

- Use `StyleSheet.create` for component styles.
- Prefer existing themed primitives such as `ThemedText`, `ThemedView`, `useThemeColor`, and values from `constants/theme` before adding new styling patterns.
- Keep styles colocated with the component unless they are shared design tokens.
- Avoid hard-coded colors when the value should respond to light and dark themes.
- Keep touch targets comfortably tappable and avoid text or controls that can overlap on narrow screens.
- Use icons from the existing icon libraries when an icon is appropriate.

## Accessibility
<!-- Why: This section ensures core app behavior remains understandable and usable for people using assistive technologies or different visual conditions. -->

- Add `accessibilityRole`, `accessibilityLabel`, and `accessibilityHint` for interactive controls when the visible content is not enough.
- Ensure tappable elements are reachable and understandable with assistive technologies.
- Do not rely on color alone to communicate state.
- Keep text readable in both light and dark themes.

## Data And Effects
<!-- Why: This section keeps async behavior reliable and prevents common React issues like stale updates, missing states, and render side effects. -->

- Put async work in effects, event handlers, or dedicated hooks, not directly in render.
- Handle loading, empty, and error states for user-facing async data.
- Guard against setting state after a component unmounts when async work can outlive the component.
- Prefer small custom hooks for reusable side-effect logic.

## Dependencies
<!-- Why: This section keeps the dependency graph stable, maintainable, and compatible with the Expo SDK. -->

- Prefer existing dependencies before adding new ones.
- Add a new dependency only when it clearly reduces complexity or provides a well-maintained platform capability.
- Keep Expo SDK compatibility in mind when changing React Native or Expo package versions.

## Team Collaboration
<!-- Why: This section helps multiple people and AI agents work in the same GitHub repository without overwriting each other or creating hard-to-review changes. -->

- Treat this `agent.md` as the shared project guide for every human and AI assistant working in this repository.
- Keep personal AI preferences, prompts, and local workflow notes outside the repository unless the team agrees they should become shared guidance.
- Work on feature branches instead of committing directly to `main`.
- Check `git status` before editing and before finishing work.
- Never revert, delete, or rewrite changes you did not make unless the user or team explicitly asks for it.
- Keep pull requests focused on one feature, fix, or cleanup.
- Link related GitHub issues, tasks, or discussions in commits and pull requests when they exist.
- Write pull request descriptions that summarize what changed, how it was verified, and any known risks or follow-ups.
- Be explicit when a change was AI-assisted if that is part of the team's GitHub or review process.
- Run `npm run lint` before opening a pull request when code changed.
- Run `npm run typecheck` before opening a pull request when TypeScript code changed.
- Avoid broad refactors, formatting-only churn, or dependency changes inside unrelated feature work.
- When conflicts or overlapping work appear, pause and coordinate instead of guessing which version should win.

## Quality Checks
<!-- Why: This section defines the minimum verification expected before considering a change ready for review. -->

- Run `npm run lint` after meaningful code changes.
- Run `npm run typecheck` after meaningful TypeScript changes.
- For UI changes, run the app with `npm start` or the relevant target command when practical.
- Check behavior on small screens and both light and dark color schemes when styling or layout changes are involved.
- Keep changes focused. Avoid unrelated refactors while implementing a feature or fix.
