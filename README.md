# Court Legends: AI Simulation League

A cinematic fantasy basketball simulator built with Next.js, TypeScript, Tailwind CSS, Framer Motion, local browser storage, and optional OpenAI enrichment.

## Run Locally

```bash
npm install
npm run dev
```

Open the printed local URL. If port 3000 is busy, Next.js will choose the next available port.

## AI Configuration

The game works without OpenAI credentials by using the deterministic local simulator. To enable AI narration and finals image generation, add:

```bash
OPENAI_API_KEY=...
OPENAI_TEXT_MODEL=gpt-4o-mini
OPENAI_IMAGE_PROMPT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-2
DATABASE_URL=postgres://...
```

Text simulation uses the Responses API with strict JSON output. Championship image prompts are expanded with `gpt-4o-mini`, then the image is generated or edited with `gpt-image-2`. If reference faces are uploaded, the finals image endpoint uses them as high-fidelity references for fictional basketball jersey transformations.

If `DATABASE_URL` is set, leagues are persisted to Postgres/Neon through the app API. Without it, browser storage remains the fallback.

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
```
