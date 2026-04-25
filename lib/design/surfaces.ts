// Material tokens for the customer order surface.
//
// surfaceFloatingRecessed — for controls that are dug into a surrounding
// surface (the canonical Stepper). Inset shadow + a translucent foreground
// fill so it reads as a slot in the parent material.
//
// (Other material tokens were retired 2026-04-25 in favor of the unified
// <Panel> primitive, which owns its own surface.)

export const surfaceFloatingRecessed =
  'bg-foreground/10 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.15),inset_0_-1px_1px_rgba(255,255,255,0.5)]'
