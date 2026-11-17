# Project Overdrive

A controller-friendly Minecraft Bedrock motorcycle racing add-on, built in testable stages.

## v0.3: cornering lean

Bikes now lean smoothly into turns based on their observed turn rate and speed. A synchronized entity property drives the bike-frame and handlebar animations; the lean fades smoothly back to upright. The rider seat has been repositioned lower and slightly forward to sit closer to the tank and reduce the floating look.

The player keeps Minecraft's native riding pose. This version deliberately avoids overriding the global player animation controller, which can break compatibility with skins and other packs; it does not yet add a custom rider torso/arm lean animation. See [`docs/v0.3-lean-and-rider-fit.md`](docs/v0.3-lean-and-rider-fit.md) for details and in-game test steps.

## Existing features

Three rideable variants (`overdrive:racer_bike`, `overdrive:sprint_bike`, `overdrive:tour_bike`), helmet items, HUD, race countdown/checkpoints/laps, speed-linked sound cue, and tire smoke are included. Spawn bikes with `/summon overdrive:racer_bike`, `/summon overdrive:sprint_bike`, or `/summon overdrive:tour_bike`. Packs target Bedrock 1.21.80+ and stable `@minecraft/server` 2.0.0.

Start a race with `/scriptevent overdrive:race start`. Edit ordered checkpoint positions in `behavior_pack/scripts/config.js` for your track. Enable both packs in a test world and inspect Content Log if anything fails to load.

## Controller and API limits

The bikes use Minecraft's native ride controls. Scripts do not receive portable raw DualSense button data. Rider animation is the vanilla mounted pose, not custom motorcycle-specific animation yet. Test synchronized leaning and seat placement in-game on each target Bedrock platform/version.
