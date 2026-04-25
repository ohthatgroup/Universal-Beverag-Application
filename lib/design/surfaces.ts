// Material tokens for the customer order surface.
//
// surfaceFloatingRecessed — for controls that are dug into a surrounding
// surface (the canonical Stepper). Backdrop-blur + translucent fill +
// border + inset shadow so the pill reads cleanly over both white tiles
// and full-bleed product images, while still feeling dug-in (not floating).
//
// (Other material tokens were retired 2026-04-25 in favor of the unified
// <Panel> primitive, which owns its own surface.)

export const surfaceFloatingRecessed =
  'bg-background/70 backdrop-blur-md border border-foreground/15 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.15),inset_0_-1px_1px_rgba(255,255,255,0.5)]'
