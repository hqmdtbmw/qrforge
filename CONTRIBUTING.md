# Contributing to QRForge

Thanks for helping. This is a short guide so your first contribution goes smoothly.

## How to help

- Fix a bug, polish the UI, improve the docs, or add a test.
- If you want to add a big feature, open an issue first and describe what you want to build. That way we can agree on the shape before you write a lot of code.
- Be kind in reviews. We are all here to make the tool better.

## Get it running

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

The app runs in local demo mode with no setup. Your data stays in your browser. To test the cloud features, copy `.env.example` to `.env.local` and add your own Firebase project values.

## Before you open a pull request

Run these two checks. Both must pass.

```bash
npm run lint
npm run build
```

`npm run lint` is the TypeScript typecheck. `npm run build` is the production build. There is no automated test suite yet. If you add one, say so in your pull request and tell us how to run it.

## What a good pull request looks like

- One change per pull request. Small and focused beats big and tangled.
- Describe what you changed and why, in plain words.
- Include a screenshot when you change something visual.
- Write like a human. Short sentences, plain words, no marketing lines.
- Do not use em dashes in commit messages, comments, or docs. Use a comma, a period, or a colon instead.
- Keep commit messages short and plain, like a developer wrote them after doing the work. For example: "fix the date filter", "clean up the settings page".

## Code review

Every pull request gets reviewed by a human before it merges. Expect questions. A review is not a rejection, it is how we keep the codebase in good shape.

## Never commit secrets

No API keys, no tokens, no passwords, no service account JSON, no real Firebase config values. If your change needs a new environment variable, add it to `.env.example` with an empty value and document it in the README.
