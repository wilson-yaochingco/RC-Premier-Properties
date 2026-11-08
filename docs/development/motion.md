# Public-page motion

How entrances and scroll effects work on the public site. Admin is excluded.

## Two mechanisms, one rule

Content is **never hidden by anything that can fail before it is shown**, and **React-owned
markup is never edited before it has hydrated**.

| Where the content is                                  | Mechanism                            | Attribute                                                                                |
| ----------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| On screen at load (page heroes, filters, first cards) | CSS keyframes in `globals.css`       | `data-enter`, `data-enter="heading"`, `data-enter="image"`, `data-enter-delay="1"`–`"6"` |
| Below the fold                                        | GSAP + ScrollTrigger in `PageMotion` | `data-motion="heading" \| "fade" \| "panel" \| "group" \| "photos" \| "sequence"`        |

- `data-enter` is pure CSS: no script, no hydration, no hidden state if JavaScript fails.
  It ends visible (`backwards` fill), and is off under `prefers-reduced-motion` and inside
  `[aria-busy="true"]` skeletons.
- `PageMotion` (mounted once per page, renders nothing) registers `data-motion` elements. It
  skips anything already in view or above it, reveals each element once, and picks up content
  that mounts later with a `MutationObserver`.
- Sequences: put `data-motion="sequence"` on a container and `data-motion-step="<type>"`
  (plus `data-motion-at="<seconds>"`) on its children. On stacked layouts each step reveals
  on its own.
- `data-motion-stagger="<seconds>"` overrides the stagger of a `group` or `photos` container.
  `photos` children carry `data-motion-frame`; `data-motion-x` adds a small sideways drift on
  wide layouts.

## Streamed (Suspense) content

Anything under a Suspense boundary must sit inside an element with
`data-motion-gate="<name>"` and render `<MotionHydrated gate="<name>" />` inside the
boundary. `PageMotion` ignores gated elements until that component has mounted, so it never
touches server HTML React has yet to hydrate (this caused a hydration mismatch on Featured
Properties). Do not use `suppressHydrationWarning` for this.

## Homepage specifics

- **Layered hero:** the hero is `position: sticky`; every later `<section>` of
  `main[data-layered-hero]` is an opaque `z-index: 1` surface, so the page slides over it.
  `HomeHeroCover` adds the scroll-linked dim and drift and pauses the video once covered.
  The header becomes sticky when `[data-home-hero-end]` (the sentinel after the hero)
  scrolls above the viewport. Reduced motion falls back to a normal `relative` hero.
- **Intro:** `HomeIntro` plays once per tab session, on the tab's first page load, only
  when that page is `/` (the head script in `app/layout.tsx` decides before first paint).
- **Scroll:** Home owns its scroll position. A reload starts at the top; Back and Forward
  return to the saved position; a hash is left to the browser.

## Loading states

Skeletons use `.sk` blocks inside `.sk-page`, which delays showing them by 200ms so fast
navigations never flash a placeholder. Loading UI is separate from empty/unavailable
states, which render real content.

## Lenis

`PublicScroll` runs one Lenis loop (`lerp: 0.075`, off for reduced motion). ScrollTrigger is
kept in sync through `useLenis(() => ScrollTrigger.update())`; there is no second loop.
