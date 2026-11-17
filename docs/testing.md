# Testing and known limits

## Smoke test

1. Import and enable both packs in a new creative world.
2. Check the Content Log for manifest, entity, or script errors.
3. Run `/summon overdrive:racer_bike ~ ~ ~` and mount it.
4. Drive with standard Bedrock movement controls; verify the action bar speed changes.
5. Set the sample checkpoint coordinates in `behavior_pack/scripts/config.js` to positions you can reach, mount, then run `/scriptevent overdrive:race start`.
6. Pass checkpoints in order and verify lap messages, then finish three laps.
7. Test with a DualSense connected to the target platform. Minecraft controls the mapping; this pack does not read raw button values.

## Platform/API limits

- Script APIs do not expose a portable way for this add-on to bind directly to DualSense R2/L2/Square/Circle/Triangle or render platform-specific controller glyphs. Native rideable input is used instead.
- The speed HUD reports the entity's measured horizontal velocity. Gear is a display estimate, not a physical transmission.
- Checkpoints are configured coordinates, not a graphical track editor or collision gates.
- Test entity input and movement on each Bedrock platform/version you plan to support; riding component behavior is owned by the game engine.
