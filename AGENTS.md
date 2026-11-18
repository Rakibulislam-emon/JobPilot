# AGENTS.md — Product UI & Frontend Engineering Standard

> Purpose: Give every coding agent a consistent standard for building polished, distinctive, accessible, production-ready interfaces. These rules apply to this repository unless a more specific `AGENTS.md` overrides them.
>
> **Core principle:** Do not generate UI just to make a page look busy. Design the clearest interface for the user's actual task, then implement and verify it.

---

## 1. Operating Rules

1. Inspect the existing repository before proposing or changing architecture.
2. Identify the framework, runtime, package manager, styling system, component library, routing, data layer, and current conventions from the actual files.
3. Preserve working functionality. Do not replace architecture, dependencies, or components without a concrete reason.
4. Do not start coding a substantial UI change until the page purpose, primary user action, content hierarchy, and visual direction are clear.
5. Work incrementally: one user flow, page, or coherent component group at a time.
6. Never claim a feature, test, visual check, or build passed unless it was actually run and verified.
7. Prefer simple, maintainable solutions over novelty. A new library must solve a real problem that the existing stack cannot solve well.

## 2. Current Technology Policy (2026+)

Use modern technology, but do not blindly install whatever has the highest version number.

Before selecting, adding, or upgrading a framework, library, or build tool:

- Check its current **official documentation**, release notes, supported-version policy, and migration notes.
- Prefer the latest stable release that is compatible with this repository's framework, runtime, and deployment target.
- Avoid experimental, canary, beta, deprecated, abandoned, or incompatible packages in production unless the task explicitly requires them and the trade-off is documented.
- Check maintenance activity, security advisories, peer dependencies, bundle impact, accessibility, and ecosystem compatibility.
- Use the existing package manager and preserve its lockfile. Never mix npm, pnpm, yarn, or Bun lockfiles casually.
- Do not upgrade unrelated packages during a feature task.
- Explain material dependency changes before making them. Do not add a dependency for a small utility that can be implemented safely with the existing stack.
- Use official documentation as the source of truth; do not rely on outdated blog posts or AI memory for current APIs.

### Preferred engineering defaults — only when compatible with the existing project

- TypeScript for application code when the repository supports it.
- Semantic HTML and accessible native browser capabilities first.
- The repository's existing framework and router; do not migrate frameworks for cosmetic reasons.
- Tailwind CSS or the existing styling system, with centralized design tokens.
- A component system such as shadcn/ui only when it fits the stack and product. Treat generated components as source code to own and customize, not as a finished visual identity.
- Lucide or the repository's existing icon set. Do not mix icon libraries without a reason.
- Playwright for browser-level interaction checks and repeatable screenshots when appropriate.
- Use server rendering, client rendering, caching, and data fetching according to the framework's current official guidance and the actual interaction/data requirements.

These are defaults, not mandatory migrations. The actual repository and official documentation take precedence.

## 3. Product and UX Thinking

Before implementation, answer these questions:

- Who is using this screen?
- What is the user's primary task?
- What information is essential to complete that task?
- What is the most important action on this screen?
- What can be removed, postponed, or shown progressively?
- What happens when data is loading, missing, invalid, or unavailable?

Design around user workflows, not around a collection of widgets.

For job-search, recruitment, and application-management workflows (where relevant): prioritize job discovery, saved jobs, application status, next actions, deadlines, and CV management. Keep high-frequency actions easy to reach. Do not fill the dashboard with decorative statistics or charts that do not help the user make a decision.

## 4. Visual Direction: Distinctive, Calm, Modern

Create a deliberate visual identity rather than reproducing a generic AI-generated SaaS template.

### Desired qualities

- Clear information hierarchy and strong visual rhythm.
- Contemporary, restrained, professional styling.
- Excellent typography: readable sizes, deliberate weights, line lengths, and hierarchy.
- Consistent spacing, alignment, radii, borders, and elevation.
- A restrained neutral foundation with a small, intentional accent palette.
- Strong contrast and clear interactive states.
- Dense information presented in an organized, scannable way; avoid both cramped layouts and oversized empty cards.
- Meaningful micro-interactions that clarify state or provide feedback, not animation for decoration.
- Visual consistency across pages, dialogs, forms, tables, menus, and empty states.

### Avoid design clichés

- A dashboard made of four statistic cards, a random chart, and decorative widgets by default.
- Excessive gradients, glassmorphism, glow effects, blur, shadows, or neon accents.
- Rounded cards nested inside other rounded cards without a clear structural reason.
- Huge headings and oversized whitespace that reduce useful information density.
- Repeated bordered containers around every small piece of content.
- Arbitrary color usage, inconsistent radii, and one-off spacing values.
- Emoji used as interface icons.
- Unnecessary animation, parallax, or motion that harms performance or accessibility.
- Fake charts, fake user data, fake activity, fake testimonials, or non-functional controls.
- Copying a reference product pixel-for-pixel. Learn from its hierarchy and interaction patterns; create an identity appropriate to this product.

Do not interpret “modern” as “add more effects”. Modern means coherent, useful, fast, accessible, and visually intentional.

## 5. Design System Before Scale

For a new product or a substantial redesign, establish or update a small design system before implementing many screens.

Define reusable tokens for:

- Brand, surface, text, muted text, border, success, warning, and danger colors.
- Typography families, sizes, weights, and line heights.
- Spacing scale and layout/container widths.
- Border radii, borders, and elevation.
- Focus rings, transitions, and motion durations.
- Breakpoints consistent with the app's layout needs.

Requirements:

- Store tokens centrally using the conventions of the existing stack (CSS variables, theme configuration, or equivalent).
- Prefer semantic tokens such as `--surface`, `--text-muted`, and `--border` over scattered raw color values.
- Define light/dark themes only when required; both themes must be intentionally designed, not mechanically inverted.
- Use a consistent type scale and spacing scale. Avoid arbitrary values unless a specific layout requires them.
- Build reusable components around repeated behavior and visual patterns, not merely to split files into tiny components.

## 6. Layout and Component Standards

- Use semantic landmarks and correct heading order.
- Establish a predictable page shell: navigation, content region, and contextual actions where appropriate.
- Make primary actions visually obvious and secondary actions quieter.
- Keep forms aligned, labels explicit, validation understandable, and errors close to the relevant field.
- Tables must support scanning, sensible column priorities, empty/loading states, and intentional mobile behavior.
- Navigation must communicate the current location and remain usable at narrow widths.
- Use consistent button sizes, input heights, icon sizes, and interaction states.
- Prefer content-first layouts. Use cards only when grouping or separating content improves comprehension.
- Use realistic content lengths when designing; do not tune layouts only against short placeholder labels.
- Avoid giant components, duplicated markup, unnecessary abstractions, and deeply nested conditional rendering.
- Keep business logic out of presentational components where practical.

## 7. Responsive Design

Treat mobile as a first-class layout, not a desktop page squeezed into a narrow viewport.

At minimum, verify the main experience at:

- Desktop: 1440 × 900
- Tablet: approximately 768 px viewport width
- Mobile: 390 × 844

Check:

- No unintended horizontal overflow.
- Navigation adapts to touch and narrow widths.
- Primary actions remain discoverable.
- Tables and dense data have a deliberate mobile presentation.
- Dialogs, dropdowns, tooltips, and menus fit within the viewport.
- Touch targets are comfortably usable.
- Text remains readable without zooming.

Adapt the layout based on content and usability, not only device labels.

## 8. Accessibility and Interaction

- Use semantic HTML before adding ARIA. Add ARIA only when native semantics are insufficient.
- Support keyboard navigation and visible focus states.
- Associate labels with inputs and provide understandable validation messages.
- Ensure sufficient text and control contrast.
- Do not communicate status through color alone.
- Respect `prefers-reduced-motion`.
- Give controls accessible names; icon-only buttons need clear labels/tooltips as appropriate.
- Ensure dialogs manage focus correctly and can be dismissed appropriately.
- Every visible button, link, menu item, and control must have a real, appropriate action.
- Provide feedback for successful, failed, pending, and disabled actions.

## 9. States and Real Data

For every data-driven feature, consider and implement the relevant states:

- Initial/loading state.
- Skeleton only when it improves perceived loading; do not use skeletons everywhere.
- Empty state with a useful next step.
- Populated state with realistic content.
- Error state with recovery guidance where possible.
- Disabled, permission-limited, or unavailable state where relevant.
- Success/confirmation feedback for mutations.

Never invent production metrics or present placeholder data as real. Clearly isolate mock data used for development or demos.

## 10. Performance and Reliability

- Avoid unnecessary client-side JavaScript and heavy dependencies.
- Optimize images, fonts, icons, and large assets.
- Avoid layout shifts; reserve space for asynchronously loaded content.
- Use pagination, virtualization, or incremental loading when data volume justifies it.
- Prevent avoidable re-renders and expensive computations, but do not add memoization without evidence or a clear need.
- Keep animations lightweight and preferably transform/opacity-based.
- Handle network failures and slow responses gracefully.
- Follow the framework's current recommended patterns for rendering, data loading, caching, and routing.
- Do not compromise security or privacy for UI convenience.

## 11. Visual QA — Required Before Calling UI Done

A successful build is not proof of a good interface. Verify the rendered product.

For each meaningful UI change:

1. Run the application using the repository's documented command.
2. Open the affected route in a real browser where browser tooling is available.
3. Inspect the actual rendered UI at desktop and mobile sizes.
4. Capture screenshots for substantial page or layout changes.
5. Check alignment, spacing, typography, overflow, contrast, hierarchy, and interaction states.
6. Test important interactions: navigation, forms, dialogs, dropdowns, filters, sorting, and primary actions.
7. Compare the result against the design brief and any provided reference images.
8. Fix material defects and capture a new screenshot after changes.

If browser automation or screenshots are unavailable, state exactly what could not be visually verified. Never claim visual QA was completed when it was not.

### Visual review checklist

- [ ] The primary user task is immediately clear.
- [ ] The most important action is easy to identify.
- [ ] The page has a coherent hierarchy and purposeful information density.
- [ ] Typography and spacing are consistent.
- [ ] Colors, borders, radii, and shadows follow the design system.
- [ ] No decorative or redundant widgets distract from the task.
- [ ] All visible controls work and expose clear states.
- [ ] Loading, empty, error, and success states are handled where relevant.
- [ ] Desktop, tablet, and mobile layouts are usable.
- [ ] Keyboard focus and accessibility basics are checked.
- [ ] No unintended overflow, broken images, or console errors remain.

## 12. Code Quality and Verification

After implementation, run the relevant scripts discovered in `package.json` or the repository's task configuration:

- Lint.
- Typecheck.
- Unit/component tests affected by the change.
- Build.
- Browser/e2e tests where configured.

Do not invent commands. Inspect the repository scripts first. If a check cannot run, report the exact blocker. Fix issues introduced by the change; do not silently ignore failures.

## 13. Git and Change Management

- Work on a focused feature branch when the repository workflow supports it.
- Keep changes scoped to the requested task.
- Do not overwrite user changes or discard unrelated work.
- Avoid mass formatting or unrelated refactors in UI tasks.
- Summarize changed pages/components, design decisions, dependencies, and verification results.
- For substantial UI changes, provide before/after screenshots in the pull request when possible.

## 14. Required Agent Workflow

For a new page or substantial redesign:

### Phase A — Inspect

Read the relevant source files, project scripts, current design tokens, reusable components, and existing UI. Identify constraints before proposing changes.

### Phase B — Plan

State the user goal, primary action, information hierarchy, proposed layout, responsive behavior, and any required component or dependency changes. Keep the plan proportional to the task.

### Phase C — Implement

Build a cohesive slice. Reuse existing patterns when they are good; improve them when they are inconsistent. Do not add visual elements merely to make the page look fuller.

### Phase D — Verify

Run checks and inspect the rendered interface. Report verified results and remaining limitations honestly.

### Phase E — Report

Finish with:

- What changed.
- Why the key design decisions were made.
- Files/components affected.
- Commands and tests actually run, with outcomes.
- Browser sizes/routes visually checked.
- Known limitations or follow-up work.

---

## Final Rule

**A page is not finished because the code compiles. It is finished when the user's task is clear, the interface is coherent, the interactions work, the responsive layouts hold up, and the result has been verified.**

When instructions conflict, prioritize: (1) explicit user requirements, (2) existing project architecture and product behavior, (3) accessibility and security, (4) this playbook, and (5) personal stylistic preference.
