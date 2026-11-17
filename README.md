# Project Overdrive

A controller-friendly Minecraft Bedrock motorcycle racing add-on, developed in small testable stages.

## v0.2: bike variety, helmets, sound, dust, and lamp details

This iteration adds three rideable bike profiles, three vanilla-rendered wearable helmet items, subtle rear tire smoke/dust, speed-pitched motor-like sound feedback, gear-change clicks, and front/rear lamp geometry. See [`docs/v0.2-visual-audio.md`](docs/v0.2-visual-audio.md) for what is and is not included.

### Spawn bike variants

```mcfunction
/summon overdrive:racer_bike ~ ~ ~
/summon overdrive:sprint_bike ~ ~ ~
/summon overdrive:tour_bike ~ ~ ~
```

All are rideable and supported by the speed HUD and race loop. The Sprint profile uses a higher native movement value; Touring uses a lower one. Bedrock controls movement and this is not a custom physics engine.

### Get helmets

```mcfunction
/give @s overdrive:helmet_carbon
/give @s overdrive:helmet_gold
/give @s overdrive:helmet_iron
```

Equip from inventory. These use vanilla helmet rendering/icons; original hand-painted helmet textures are a future asset pass.

### Race

```mcfunction
/scriptevent overdrive:race start
/scriptevent overdrive:race reset
```

Edit ordered checkpoint positions in `behavior_pack/scripts/config.js` for your circuit. Both packs must be imported and enabled. Minecraft Bedrock 1.21.80 or newer with stable `@minecraft/server` 2.0.0 is recommended.

## Controls and limitations

The bikes use the game's native ride controls. Add-on scripts do not get portable raw DualSense trigger/button binding. Sound uses built-in Minecraft audio as a prototype, and the tire effect uses a vanilla smoke particle; bespoke recordings and textures are not included. The lamp meshes are visible model details, not a dynamic light source. Bedrock must be launched to verify rendering, item equipping, sound IDs, and movement on the target version/platform.
