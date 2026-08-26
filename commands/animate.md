# /animate — Animate, Optional (Phase 2 of 8)

## Purpose

The dashed, optional step in the original design: bring the inspiration design to life with motion. Skip freely when the project does not need it.

## Instructions

1. Read the design brief from `docs/design/iteration-<N>.md`.
2. Add motion deliberately and sparingly:
   - Page and element transitions
   - Micro-interactions (hover states, loading states, button feedback)
   - Entrance animations for dashboard widgets
3. Respect `prefers-reduced-motion`; motion must be an enhancement, never a requirement.
4. Keep animation code isolated in its own components/module so it can be removed cleanly.

## Checklist

- [ ] Page/element transitions added
- [ ] Micro-interactions added (hover, loading states)
- [ ] Reduced-motion preference respected

## When done

If you animated: `vibe-loop done animate`

If this project should skip motion entirely:

```
vibe-loop skip
```

The next phase is main-functionality.
