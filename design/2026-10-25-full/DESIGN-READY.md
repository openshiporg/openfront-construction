# Construction: full redesign of platform pages and storefront (2026-10-26)

Brief: `~/Code/Euler/state/briefs/batches-2-6-full-redesign-2026-10-25.md`.

Live: https://openfront-construction-production.up.railway.app
Commits on master, each auto-deployed: `b929920` (redesign), plus the commit carrying this report, the link-colour fix and the after screenshots.

## Critique of the previous UI (before screenshots in `before/`)
- **Platform.** Buttons and filters were raised pills in a recessed rounded track, and the project-tool tabs were a pill track too. Labels were mono uppercase tracked capitals. Panels had 12px corners, and every header carried an icon tile. The "Move" buttons were pills.
- **Storefront.** A steel site-board world: a dark slab with grid lines and hazard tape, mono uppercase kickers, "SVC-01" codes, and numbered sections (01, 02, 03). Project cards had grid-pattern plates with monograms, and the header nav was a pill track. It read as a contractor template rather than a specific civic builder.

## Platform (`features/platform/**`), Operate mode inside the shared shell
- **Kit** (`kit.tsx`, `pill.ts`):
  - `pillClass` draws flat 5px buttons: outline for secondary, solid orange only for the primary action, and a ghost style.
  - `trackClass` is a plain button row.
  - `SegmentTabs` are underline tabs on a ruled baseline, and status labels take their tone colour.
  - Panels, disclosure panels, empty states and metric strips are bordered at 6px and compact.
  - Page headers lose their icon tiles; the eyebrow moves into the meta line.
  - Inputs and selects are 5px.
- **Project workspace.** The project tools (Overview, Preconstruction, Financials, Cost structure, Contracts and changes, Procurement, RFIs and submittals, Field operations, Schedule and tasks, Quality and safety, and the rest) are one underline tab bar. Its three phases are divided by a short rule.
- **Everywhere.** Mono uppercase tracked labels became sentence case, table header capitals became plain small labels, and radii are pinned at 6px or less across the platform. Bid-comparison, scope and save-bar pills are squared. Table scrollers are positioned, so sr-only cells can't widen the phone page.

## Storefront (`features/storefront/**`, `catalog.css`)
- **World.** The card catalog of the schools and libraries the firm builds (contract in `.impeccable/surfaces/features-storefront.md`, `seed:9f80556980933f46`). Oak-cabinet bands for the hero, utility strip and footer, with a reading-room plaster ground.
- **Cards.** Every project is a typed buff index card: subject and place above a red rule, title in Source Serif, the summary, typed facts (location, delivery method), and the rod hole at its foot. Each card lifts on hover. The firm's own catalog card on the hero carries service area, services, projects, markets, phone and email.
- **Services.** A ruled subject guide: market, then title, summary and Details.
- **Removed.** Numbered sections, grid lines and hazard tape are gone; mono labels became sentence case.
- **Controls and type.** Buttons are flat 4px blocks, and the logo hue colours only the primary action. Public Sans (headings and reading) with Source Serif 4 (card records) replace Archivo and IBM Plex. The stylesheet is renamed `catalog.css` to force a fresh compile, and the `sf-*` class API is kept, so every public, intake, account and portal route renders in the new world.
- **Fix after the first capture.** The `.storefront a` colour reset outranked the primary button colour, which left dark text on blue outside the oak bands. It's now `:where(a)`.
- **PRODUCT.md.** Added: inferred from the repository and the brief, marked as inferred, with the fictional-sample provenance kept.

## Skills used, and on what
- **impeccable:**
  - `init` was replaced by an inferred PRODUCT.md (the owner ordered no approval stage).
  - `concept-seed --scope direction --mode persuade` assigned #7 of my ranked seven (the library card catalog). Its declined challengers each donated a discipline, named in the contract: one card anatomy in fixed field order, structure as the only ornament, two inks per card, the focused card lifts, rules not boxes, and one ink for live state.
  - `surface-brief write` recorded the contract, and `craft-floor.md` set the build floor.
- **Memory traps from earlier redesigns:** the 8px dashboard radius, sr-only scroller overflow, the `.sf a` reset outranking component classes, and the stale CSS compile.
- Not run on this repo: the finish reviewer and the documenter. The other design skills named in the brief were not loaded this run.

## Gates
- **Typecheck:** `tsc --noEmit -p .` through heavy-exec, exit 0 (journal 23:00Z, 2026-10-26) on the redesign source. Later changes are className strings and one CSS selector only.
- **Unit tests:** not run. The heavy-exec queue was blocked by the 20 GiB disk floor again (a Remotion render in `~/Code/product-videos` refilling the disk). Run `tests/*.cjs` when the slot frees.
- **Parity:** drift 0, missing 0, sidebar ok.
- **Live CSS:** the new-only token `--sf-red` was confirmed in the served CSS after deploy.

## Open items
- **Tests and review.** The unit tests, a finish-reviewer pass and the documenter have not run, and there is no prior DESIGN.md.
- **No project photos.** Project records have no image fields, so the cards are built from typed facts.

## Screenshots
`before/` and `after/` were captured at 1440 desktop and 390 phone (2x), full page, with Playwright WebKit.
