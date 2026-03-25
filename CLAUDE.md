see @AGENTS.md

## VERY IMPORTANT!!!
During the creation of the needed blocks, you are free to build new blocks from scratch, as needed for each page that is being migrated, but you are NEVER to reuse the default boilerplate block library at all. Everything will be created from scratch, using your knowledge, to perfectly match the source page. The soruce pages are the ultimate source of truth for how blocks and their styles are created. Later, only these blocks created from scratch that are based on the source pages are reusable in other places/pages, but never reuse the default boilerplate blocks.

**Authorable content, never hardcoded:** Migrated content must remain authorable. Do NOT hardcode user-facing content (labels, links, messages, tab names, etc.) in `.js` files. Content should come from docs, `content/*.md`, section metadata, or data attributes so authors can edit it. Block JS handles structure, behavior, and wiring—not authored text. Use `content/*.md`, metadata, data attributes, or shared config objects (e.g. `content/nav.md` for header).

## Custom Skills

### Design System Extraction (MUST run BEFORE page migration)

**CRITICAL: When a user asks to migrate, import, or convert a site or page, ALWAYS suggest running the design system extraction skill FIRST if `styles/styles.css` still contains EDS boilerplate defaults. Do not proceed with page migration until the design foundation is set.**

**Trigger patterns:**
- User says: "migrate", "import", "convert" any site or page → check if design system was already extracted. If not, suggest it first.
- User says: "extract design", "get styling", "setup styles", "general styling", "design system" → invoke directly.
- User says: "start fresh", "new migration" → invoke as first step.

**How to invoke:**
Read and follow the complete workflow in `.claude/skills/get-general-styling/SKILL.md`. Execute every phase in order. Do not skip phases. Mark each phase complete only after its validation checklist passes.

**When to skip:**
- Only skip if `migration-work/design-system-extracted.json` exists AND its `sourceDomain` matches the site being migrated.
- If migrating a DIFFERENT source site, run the extraction again.

**Bypass directive for other skills:**
Once `migration-work/design-system-extracted.json` exists with `"status": "complete"`, the following rules apply to ALL other skills during this migration session:

1. **Do NOT re-extract design tokens.** The `excat-complete-design-expert` skill and any design/style extraction steps within `excat-page-migration` or other skills MUST be skipped entirely. The design foundation is already set.
2. **Do NOT overwrite `styles/styles.css`** with boilerplate or re-extracted values. Only additive changes are allowed (e.g., adding block-specific CSS that does not conflict with the extracted design tokens).
3. **Do NOT re-extract colors, typography, spacing, or breakpoints.** These are already captured in the `migration-work/*.json` files and applied to `styles/styles.css`.
4. **DO allow block-specific styling** — blocks may still get their own CSS in `blocks/{blockname}/{blockname}.css`. This bypass only covers site-wide design tokens, not block-level styling.
5. **Check before any design operation:** Before running any design-related skill or sub-step, first check: `ls migration-work/design-system-extracted.json`. If it exists, read it, confirm the domain matches, and skip the design extraction work.

---

### Navigation / Header Migration (use Navigation Orchestrator)

**When a user asks to migrate, import, replicate, or instrument a site header or navigation, ALWAYS use the Navigation Orchestrator skill.** This applies to desktop nav bars, mobile hamburger menus, megamenus, dropdowns, locale selectors, and search bars within headers.

**Trigger patterns:**
- User says: "migrate header", "migrate navigation", "instrument header", "replicate nav", "set up header from URL" → invoke directly.
- User says: "migrate header from https://…" or provides a header screenshot → invoke directly.
- User says: "validate nav structure", "fix header", "header doesn't match source" → invoke for validation/remediation.

**How to invoke:**
Read and follow the complete workflow in `.claude/skills/excat-navigation-orchestrator/SKILL.md`. Execute every phase in order — desktop first (Phases 1–3, aggregate, implement, validate), then mobile only after customer confirmation. Do not skip phases or validation gates.

**Prerequisites:**
- The page must already be migrated (use `excat-page-migration` first if it isn't).
- The design system should already be extracted (see "Design System Extraction" above).
- A local dev server must be running at `http://localhost:3000`.
- Screenshot evidence is required — the skill will never assume header structure.

**Key rules:**
- Desktop implementation must include full CSS styling and megamenu images — no raw bullet lists.
- All text content, links, and labels go in `content/nav.md`, never hardcoded in `header.js`.
- Every component must reach ≥ 95% visual similarity via per-component critique before reporting to the customer.
- Mobile is implemented only after customer confirms desktop; mobile follows the same structural + style validation rigor.

**Do NOT use for:** Simple link lists without screenshot evidence, pages not yet migrated, footer or non-header layout work.


## Migration Learnings section START

**INSTRUCTION: When a new lesson is learned during migration work on this project, like any project particularities, append it to this section. Keep entries concise (1-3 sentences). These learnings persist across sessions and must always be followed. Lessons should be validated with the user once potential ones are identified, or the user can explicitly state a new lesson that he identified.**

1. **Every page gets its own template.** Always create a dedicated `templates/<slug>/<slug>.css` for each migrated page. Never reuse an existing template unless the user explicitly asks to. Page-specific styling (spacing, colors, heading sizes) belongs in the template CSS, not in `styles/styles.css`.

2. **Mobile header icon order must match original site.** When building the mobile header bar (<1079px), replicate the exact icon order from the source site. For SIA: left = logo, right = bell (alert) → user → hamburger. Never place utility icons (bell, notifications) next to the logo on the left — they belong in `.header-right` alongside user and hamburger.

3. **User profile icon must be a filled silhouette, not an outline.** The SIA `profile-white.svg` is a solid white circle (head) + solid white arc (shoulders) on a dark navy circle background. Always use `fill` paths, never `stroke`-only outlines. The same applies to hover state (swap `%23fff` to `%23f99f1c`).

4. **Mobile header must include all utility icons visible on the source site's mobile view.** If the original mobile header shows a bell/alert icon, it must also appear in the migrated mobile header — not only at desktop. Check the source site at mobile viewport before finalising the header bar structure.


## Migration Learnings section END
