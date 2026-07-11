# Cultural Sound Studio

A YYGS capstone prototype: an AI-assisted music studio that helps you compose from a curated
library of real rhythms, scales and instruments — while making transparency, user control and
ethics education part of the creative process itself.

**Research question:** How can an AI interface use transparency, user-adjustable control, and
embedded ethics education to help people create culturally inspired work they trust and feel
ownership over — while avoiding stereotyping or appropriation?

## How the build answers it

| Capstone pillar | In the app |
|---|---|
| **Transparency** | Every element and every suggestion shows its origin, meaning and source citation ("chain of influence"). The assistant explains *why* it suggested something. |
| **User-adjustable control** | *Reproduce ↔ Reinterpret* and *Single tradition ↔ Blended* sliders filter and reorder suggestions. Nothing is added without the user's click. |
| **Embedded ethics education** | *Learn-first* elements stay locked until you read their cultural context. *Restricted* elements (Yidaki, Sun Dance Song) are view-only — the app explains why and offers no preview, so the guardrail itself teaches. |
| **Anti-stereotyping** | Vague or stereotyping prompts ("exotic", "tribal", "African drums") get a clarifying question instead of a guess. Risky combinations (many traditions flattened together, mixed modal systems) are flagged with reasoning. |
| **Credit / ownership** | Export produces **liner notes**: every element with its tradition, meaning and source, plus your slider settings — credit travels with the piece. |

## Run it

No build step, no dependencies. Audio is synthesized live with the Web Audio API.

```
python3 -m http.server 4173   # then open http://localhost:4173
```

Or just open `index.html` in a browser. Deployable as-is to GitHub Pages or Netlify.

## Files

- `index.html` — page shell, icon sprite, layout
- `styles.css` — design system (dark studio theme)
- `data.js` — the curated element dataset (cultural metadata, sources, sound specs) + keyword/guardrail rules
- `app.js` — audio engine, suggestion scoring, ethics flags, prompt handling, liner-notes export

The "AI" is intentionally rule-based and inspectable — the point of the prototype is that its
reasoning is visible. Swapping `handlePrompt`/`scoreElement` for a Claude API call is the natural
next step.
