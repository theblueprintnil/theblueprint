# /build — Main Functionality (Phase 3 of 8)

## Purpose

Build the main functionality from the design brief: the dashboard, the widgets, and the core features. This is the heart of the loop.

## Instructions

1. Read `docs/design/iteration-<N>.md` and build only what it scopes.
2. Build in this order:
   - Dashboard shell and layout
   - Primary widget(s) first, secondary widgets after
   - Wire widgets to data sources / API routes
3. Handle empty, loading, and error states for every widget.
4. Follow the project's existing conventions; when scaffolding a fresh project, use the stack defaults the loop assumes (Next.js App Router, TypeScript, Tailwind).
5. Do not add auth, deployment config, or E2E tests here — later phases own those.

## Checklist

- [ ] Dashboard shell and layout built
- [ ] Primary widget(s) implemented
- [ ] Widgets wired to data sources / API routes
- [ ] Empty, loading and error states handled

## When done

```
vibe-loop done main-functionality
```

The next phase is local-testing (automated — the engine will run the build and unit tests).
