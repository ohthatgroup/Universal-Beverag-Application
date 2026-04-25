// Material tokens for the customer order surface.
//
// Two recipes, codified once. Every glass-style component composes one of
// these as its base; tweaks (corner radius, padding, ring) live on the
// component, not the recipe.
//
// Why two and not one: the affordance differs.
//
//   surface-overlay  — anchored full-width chrome (cart bar, sheet
//                      headers/footers, top nav). Lives "on the page,"
//                      lighter blur, semi-opaque so content reads
//                      through but the bar still feels solid.
//
//   surface-floating — focused detached object (popout capsule, dug-in
//                      stepper, search-trigger pill). Lifts off the
//                      page; heavier blur, a subtle border highlight,
//                      soft drop shadow.
//
// Tinted variants apply when the surface itself signals state — primary
// tint when "you have items in your cart," recessed when the surface is
// "dug into" a parent (inset shadow instead of lift shadow).
//
// Keep these strings minimal. Layout (rounded-*, padding) is always the
// caller's responsibility.

export const surfaceOverlay =
  'bg-background/80 backdrop-blur-md border border-foreground/10'

/**
 * @deprecated for customer-surface use as of 2026-04-25.
 * The cart bar previously used this token; per doctrine Rule 6 (one
 * primary-tinted affordance per region), the cart bar now uses
 * `surfaceOverlay` and the accent Review button is the single signal.
 * Do not adopt this token for new customer-surface chrome.
 */
export const surfaceOverlayPrimary =
  'bg-primary/10 backdrop-blur-md border border-primary/20'

export const surfaceFloating =
  'bg-background/60 backdrop-blur-2xl border border-white/40 shadow-2xl'

// "Recessed" — for controls that are dug into a surrounding glass surface
// rather than floating above it. Inset shadow + a translucent foreground
// fill so it reads as a slot in the parent material.
export const surfaceFloatingRecessed =
  'bg-foreground/10 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.15),inset_0_-1px_1px_rgba(255,255,255,0.5)]'
