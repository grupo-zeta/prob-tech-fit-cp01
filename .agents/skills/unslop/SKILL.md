---
name: unslop
description: De-AI both writing/copy (theclaymethod/unslop) and UI/UX design (heydamir/unslop). Strips formulaic AI prose tells (em dashes, buzzwords, rule-of-three, shouty caps) and refactors "vibecoded" AI interfaces (purple/neon gradients, glowing borders, emoji icons, nested cards) through 9 ordered passes into calm, human-crafted software.
---

# Unslop — De-AI Writing & UI Design Skill

Combines the two open-source `unslop` methodologies:
1. **`theclaymethod/unslop` (Prose & Microcopy):** Diagnoses and rewrites AI-generated text patterns (`references/core-contract.md`).
2. **`heydamir/unslop` (UI/UX Redline & 9 Ordered Passes):** Audits and refactors generic AI-generated interfaces into grounded, human-designed software.

---

## Part 1: Prose & Microcopy (`theclaymethod/unslop`)

### Common AI Writing Tells to Eliminate
- **Punctuation Slop:** Excessive em dashes (`—`), stacked middle dots (`·`), and dramatic colon setups (*"Here's the thing:"*).
- **Shouty All-Caps & Parentheticals:** Buttons like `▶ INICIAR FOCO (GO)` or titles like `✦ MOTOR PREDITIVO DE FOCO & FADIGA (IA LOCAL EMBUTIDA)`. Use natural sentence case (`Iniciar sessão`, `Fadiga e ritmo`).
- **Rule-of-Three & Marketing Puffery:** Triplets of adjectives (*"100% offline, privado e instantâneo"*), hollow intensifiers (*"inteligente"*, *"revolucionário"*), and unsolicited reassurance.
- **Emoji/Symbol Crutches:** Using `🔒`, `⚡`, `✦`, `☕`, `🧭`, `▣`, `♧` as pseudo-icons inside text labels.

---

## Part 2: UI/UX Design (`heydamir/unslop` — The 9 Ordered Passes)

Execute passes in strict order so structural rhythm is fixed before surface details:

1. **Pass 1 — Spacing:** Align padding, gaps, and margins to a strict 4px/8px scale (`4px`, `8px`, `12px`, `16px`, `24px`). Eliminate cramped or uneven gaps.
2. **Pass 2 — Color (Quiet Chrome):**
   - Ban the stereotypical AI dark palette (deep purple `#0d0b16`, violet cards `#1c162b`, neon cyan `#00d1e7` glows, and floating `radial-gradient` orbs).
   - Use **Quiet Chrome**: neutral architectural carbon/slate surfaces (`#111315` background, `#17191c` panel, `#1e2024` input field, `#282b30` 1px solid hairline borders, `#ededef` primary text, `#8e939d` secondary text).
   - Derive the single primary accent from the authentic brand mark (`brand.svg` warm terracotta/amber `#e87d3e` / `#f29a5e`), reserving green (`#2fb380`), blue (`#4c7ef3`), and red (`#e55353`) strictly for semantic data states.
3. **Pass 3 — Icons:** Replace all unicode symbols (`▣`, `◷`, `✦`, `♧`, `⚡`, `🔒`) with clean 1.5px stroke geometric SVGs or plain text.
4. **Pass 4 — Copy:** Apply `theclaymethod/unslop` across every heading, label, badge, and helper string. Keep microcopy direct, factual, and quiet.
5. **Pass 5 — Typography:** Use sentence case for section titles. Use `font-variant-numeric: tabular-nums` for timers and metrics. Avoid glowing `text-shadow`.
6. **Pass 6 — Layout:** Avoid the AI landing-page cliché (left marketing pitch with 3 icon-cards + right form). Use a clean, focused desktop utility sign-in and an instrument-grade workspace grid.
7. **Pass 7 — Details:** Use crisp `1px solid` borders without `box-shadow` neon blooms or heavy `backdrop-filter` glassmorphism.
8. **Pass 8 — Visuals:** Let `brand.svg` stand on its own geometry without infinite CSS keyframe pulsing or heavy drop-shadows.
9. **Pass 9 — Motion:** Use fast, functional `120ms ease` transitions on background and border-color only.
