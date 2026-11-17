import { system, world } from "@minecraft/server";
import { HUD_INTERVAL_TICKS, MAX_LAPS, TICK_RATE, TRACK_CHECKPOINTS } from "./config.js";

const bikeTypes = ["overdrive:racer_bike", "overdrive:sprint_bike", "overdrive:tour_bike"];
const racers = new Map();
const lastGear = new Map();
let raceRunning = false;
let countdown = 0;
let elapsedTicks = 0;
let hudTicks = 0;

function formatTime(ticks) {
  const seconds = ticks / TICK_RATE;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}
function distanceSquared(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}
function getBikes() {
  const dimension = world.getDimension("overworld");
  return bikeTypes.flatMap((type) => dimension.getEntities({ type }));
}
function riderIds() {
  const ids = new Set();
  for (const bike of getBikes()) {
    const rideable = bike.getComponent("minecraft:rideable");
    if (rideable) for (const rider of rideable.getRiders()) ids.add(rider.id);
  }
  return ids;
}
function startRace() {
  if (TRACK_CHECKPOINTS.length < 2) {
    world.sendMessage("§c[OVERDRIVE] Configure at least two track checkpoints in scripts/config.js.");
    return;
  }
  raceRunning = false;
  countdown = 3;
  elapsedTicks = 0;
  racers.clear();
  const mounted = riderIds();
  for (const player of world.getPlayers()) if (mounted.has(player.id)) racers.set(player.id, { lap: 1, checkpoint: 0, finished: false });
  if (racers.size === 0) {
    world.sendMessage("§c[OVERDRIVE] Mount an Overdrive bike before starting the race.");
    countdown = 0;
    return;
  }
  world.sendMessage("§e[OVERDRIVE] Race starts in 3...");
  system.runTimeout(() => { if (countdown !== 0) world.sendMessage("§e[OVERDRIVE] 2..."); }, TICK_RATE);
  system.runTimeout(() => { if (countdown !== 0) world.sendMessage("§e[OVERDRIVE] 1..."); }, TICK_RATE * 2);
  system.runTimeout(() => { if (countdown !== 0) { countdown = 0; raceRunning = true; world.sendMessage("§a[OVERDRIVE] GO!"); } }, TICK_RATE * 3);
}
function resetRace() {
  raceRunning = false; countdown = 0; elapsedTicks = 0; racers.clear();
  world.sendMessage("§7[OVERDRIVE] Race state reset.");
}
function playSound(bike, soundId, options) {
  try { bike.playSound(soundId, options); } catch { /* Audio is best-effort; gameplay must not depend on it. */ }
}
world.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "overdrive:race") return;
  const action = event.message.trim().toLowerCase();
  if (action === "start") startRace();
  else if (action === "reset") resetRace();
  else event.sourceEntity?.sendMessage("§eUse /scriptevent overdrive:race start or /scriptevent overdrive:race reset");
});

system.runInterval(() => {
  const bikes = getBikes();
  const currentRiders = new Set();
  for (const bike of bikes) {
    const rideable = bike.getComponent("minecraft:rideable");
    if (!rideable) continue;
    const velocity = bike.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    const speedKmh = Math.round(horizontalSpeed * TICK_RATE * 3.6);
    const gear = Math.max(1, Math.min(6, Math.floor(speedKmh / 25) + 1));
    const riders = rideable.getRiders();
    const moving = horizontalSpeed > 0.025;

    for (const player of riders) {
      currentRiders.add(player.id);
      if (hudTicks % HUD_INTERVAL_TICKS === 0) {
        const state = racers.get(player.id);
        const bikeLabel = bike.typeId.split(":")[1].replace("_bike", "").toUpperCase();
        const race = state ? `L${state.lap}/${MAX_LAPS} CP${state.checkpoint + 1}/${TRACK_CHECKPOINTS.length} ${formatTime(elapsedTicks)}` : "FREE RIDE";
        player.onScreenDisplay.setActionBar(`§6${bikeLabel}  ${speedKmh} km/h  §fG${gear}  §e${race}`);
      }
    }

    if (riders.length > 0 && moving) {
      // Built-in minecart sound used as a temporary motor-like tone; pitch follows measured speed.
      if (hudTicks % 10 === 0) playSound(bike, "minecart.riding", { volume: Math.min(0.7, 0.2 + horizontalSpeed * 0.45), pitch: Math.min(1.7, 0.7 + horizontalSpeed * 1.5) });
      // Lightweight tire dust puffs from the rear axle, at a restrained interval.
      if (hudTicks % 8 === 0) {
        const rotation = bike.getRotation().y * Math.PI / 180;
        const rear = { x: bike.location.x - Math.sin(rotation) * 0.55, y: bike.location.y + 0.12, z: bike.location.z + Math.cos(rotation) * 0.55 };
        try { bike.dimension.spawnParticle("minecraft:basic_smoke_particle", rear); } catch { /* Particle support is cosmetic and must not interrupt the race. */ }
      }
      const gearBefore = lastGear.get(bike.id);
      if (gearBefore !== undefined && gearBefore !== gear) playSound(bike, "random.click", { volume: 0.3, pitch: gear > gearBefore ? 1.2 : 0.8 });
    }
    lastGear.set(bike.id, gear);
  }

  if (raceRunning) {
    elapsedTicks++;
    for (const player of world.getPlayers()) {
      const state = racers.get(player.id);
      if (!state || state.finished || !currentRiders.has(player.id)) continue;
      const checkpoint = TRACK_CHECKPOINTS[state.checkpoint];
      const radius = checkpoint.radius ?? 6;
      if (distanceSquared(player.location, checkpoint) > radius * radius) continue;
      state.checkpoint++;
      if (state.checkpoint < TRACK_CHECKPOINTS.length) { player.sendMessage(`§b[OVERDRIVE] Checkpoint ${state.checkpoint}/${TRACK_CHECKPOINTS.length}`); continue; }
      state.checkpoint = 0;
      if (state.lap >= MAX_LAPS) { state.finished = true; player.sendMessage(`§a[OVERDRIVE] Finished in ${formatTime(elapsedTicks)}!`); continue; }
      state.lap++;
      player.sendMessage(`§e[OVERDRIVE] Lap ${state.lap}/${MAX_LAPS} — ${formatTime(elapsedTicks)}`);
    }
    if ([...racers.values()].every((state) => state.finished)) { raceRunning = false; world.sendMessage("§6[OVERDRIVE] Race complete."); }
  }
  hudTicks++;
}, 1);
