# Project Overdrive

A controller-friendly Minecraft Bedrock motorcycle racing add-on. This first playable slice focuses on a genuinely rideable bike, native movement input, a live speed/gear HUD, and a configurable checkpoint/lap loop. It is intentionally honest about Bedrock's input limits: add-ons receive game-normalized movement input through the rideable entity; they cannot bind directly to DualSense trigger/button signals or display actual PS5 button prompts.

## Current playable features

- A rideable, blocky motorcycle entity: `overdrive:racer_bike`.
- Native Bedrock riding controls, including controller stick movement where supported by the game/platform.
- Scripted HUD with speed in km/h, inferred gear, lap, checkpoint, and timer.
- Countdown and checkpoint/lap tracking for one configurable circuit.
- Reset command and guidance for adding your own track.

This is the first staged build, not a claim that every feature in the original design brief is already implemented. Custom bike/helmet assets, individual bike tuning, replay cameras, full menus, and custom DualSense button bindings remain future work.

## Requirements

- Minecraft Bedrock Edition with the stable `@minecraft/server` 2.0.0 module available (Minecraft 1.21.80 or newer is recommended).
- Both packs imported and enabled in the world.
- Cheats/commands enabled to use `/summon` and `/scriptevent`.

The add-on does not require experimental raw controller access. The game maps controller movement to the entity's normal ride controls. Trigger mapping and exact button behavior depend on Minecraft's platform control settings; scripts cannot force R2/L2/Square/Circle/Triangle bindings.

## Install

1. Download this repository and open `behavior_pack/` and `resource_pack/` as separate packs, or package each folder as a `.mcpack` archive.
2. Import both packs into Minecraft Bedrock.
3. Create/open a world and enable **Project Overdrive Behavior Pack** and **Project Overdrive Resource Pack** (the resource pack is referenced by the behavior pack).
4. In a test area, run:

   ```mcfunction
   /summon overdrive:racer_bike ~ ~ ~
   ```

5. Look at the bike and interact to mount it. Use the normal in-game movement controls/controller stick to steer and move; dismount using the game's sneak/dismount control.

## Test the race loop

The sample circuit is centered near world coordinates `(0, 64, 0)`. Change the checkpoint coordinates in `behavior_pack/scripts/config.js` to match your track before racing. The ordered checkpoints form a loop; pass each checkpoint within its radius, then return to checkpoint 0 to complete a lap.

```mcfunction
/scriptevent overdrive:race start
/scriptevent overdrive:race reset
```

The start command broadcasts a three-second countdown and starts the lap timer. Players must be riding an Overdrive bike to participate. Checkpoints are lightweight coordinate checks, so they do not require always-ticking marker entities.

## Controls

The bike uses Minecraft's built-in rideable movement, not a JavaScript DualSense driver. On a controller, use the standard in-game movement/steering control shown by Minecraft's current control settings. Mount/dismount with the game's interact/sneak controls. Exact button glyphs vary by platform and player remapping.

## Configure a track

Edit `TRACK_CHECKPOINTS` in `behavior_pack/scripts/config.js`. Each entry is `{ x, y, z, radius }`. Put them in the order racers should pass through them and ensure the last checkpoint leads back to the first. Keep checkpoint radii sensible (typically 4–8 blocks) and set `y` near the road surface. The sample coordinates are illustrative and can be replaced with a track anywhere in the world.

## Development notes

- Behavior pack script entry point: `behavior_pack/scripts/main.js`.
- Entity behavior: `behavior_pack/entities/racer_bike.json`.
- Resource pack geometry and client entity: `resource_pack/models/entity/racer_bike.geo.json`, `resource_pack/entity/racer_bike.entity.json`.
- The current model uses a built-in Minecraft texture to keep the pack self-contained; a dedicated texture and multi-bike art pass are planned.
- Test in a clean creative world first. Bedrock entity component/API availability can vary between game releases; check the Content Log if a pack fails to load.

## Roadmap

1. Validate rideable bike, HUD, countdown, and laps on target Bedrock versions/controllers.
2. Add original bike/helmet textures, colors, racing number selection, and a second tuned bike.
3. Add a track editor/marker workflow, position/results, and race menus.
4. Add sound and animation polish, then evaluate camera options against supported Bedrock APIs.

## License

See repository license information. If none is provided, obtain permission before redistributing assets or code.
