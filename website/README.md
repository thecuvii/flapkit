# Flapkit website

Private Next.js documentation and demo workspace for `@thecuvii/flapkit`.

## Deploy

The site is a static export on Cloudflare Workers. From the repo root:

```sh
pnpm deploy
```

Workers Builds should use:

- Build command: `pnpm run build:website`
- Deploy command: `npx wrangler deploy --config website/wrangler.jsonc`

## Analytics

PostHog initializes from `instrumentation-client.ts` when
`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set. Copy `.env.example` to `.env.local`
and use the US host (`https://us.i.posthog.com`) or the EU host
(`https://eu.i.posthog.com`). Set the same variables as Workers Builds
**Build → Variables and secrets** so `next build` can inline them.
