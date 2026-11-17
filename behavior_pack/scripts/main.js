import { system, world } from "@minecraft/server";
import { HUD_INTERVAL_TICKS, MAX_LAPS, TICK_RATE, TRACK_CHECKPOINTS } from "./config.js";

const bikeTypes = ["overdrive:racer_bike", "overdrive:sprint_bike", "overdrive:tour_bike"];
const NEAR_RIVAL_DISTANCE = 10;
const PROXIMITY_CUE_COOLDOWN_TICKS = 40;
const racers = new Map();
const lastGear = new Map();
const bikeMotion = new Map();
const lastProximityCue = new Map();
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
function updateLean(bike, horizontalSpeed) {
  const yaw = bike.getRotation().y;
  const previous = bikeMotion.get(bike.id) ?? { yaw, lean: 0 };
  let yawDelta = yaw - previous.yaw;
  if (yawDelta > 180) yawDelta -= 360;
  if (yawDelta < -180) yawDelta += 360;
  const speedFactor = Math.min(1, horizontalSpeed / 0.12);
  const targetLean = Math.max(-1, Math.min(1, (-yawDelta / 5.0) * speedFactor));
  const lean = previous.lean + (targetLean - previous.lean) * 0.24;
  bikeMotion.set(bike.id, { yaw, lean });
  try {
    const synchronizedLean = bike.getProperty("overdrive:lean");
    if (typeof synchronizedLean === "number" && Math.abs(synchronizedLean - lean) > 0.025) bike.setProperty("overdrive:lean", lean);
  } catch {
    // Older game builds may not support synchronized entity properties; the bike remains rideable.
  }
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
  lastProximityCue.clear();
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
  raceRunning = false; countdown = 0; elapsedTicks = 0; racers.clear(); lastProximityCue.clear();
  world.sendMessage("§7[OVERDRIVE] Race state reset.");
}
function playSound(entity, soundId, options) {
  try { entity.playSound(soundId, options); } catch { /* Audio is best-effort; gameplay must not depend on it. */ }
}
function playRivalProximityCues(activeRacers) {
  if (!raceRunning || activeRacers.length < 2) return;
  const radiusSquared = NEAR_RIVAL_DISTANCE * NEAR_RIVAL_DISTANCE;
  const livePlayerIds = new Set(activeRacers.map(({ player }) => player.id));
  for (const id of lastProximityCue.keys()) if (!livePlayerIds.has(id)) lastProximityCue.delete(id);

  for (const racer of activeRacers) {
    let nearestDistanceSquared = radiusSquared;
    for (const rival of activeRacers) {
      if (rival.player.id === racer.player.id || rival.bike.dimension.id !== racer.bike.dimension.id) continue;
      const separationSquared = distanceSquared(racer.bike.location, rival.bike.location);
      if (separationSquared < nearestDistanceSquared) nearestDistanceSquared = separationSquared;
    }
    if (nearestDistanceSquared >= radiusSquared) continue;
    const lastCueTick = lastProximityCue.get(racer.player.id) ?? -PROXIMITY_CUE_COOLDOWN_TICKS;
    if (hudTicks - lastCueTick < PROXIMITY_CUE_COOLDOWN_TICKS) continue;

    const distance = Math.sqrt(nearestDistanceSquared);
    // A restrained spatial cue lets the racer know a competitor is close without spamming every tick.
    playSound(racer.player, "random.orb", {
      volume: 0.35,
      pitch: 0.8 + (1 - distance / NEAR_RIVAL_DISTANCE) * 0.45
    });
    lastProximityCue.set(racer.player.id, hudTicks);
  }
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
  const activeRacers = [];
  const liveBikeIds = new Set(bikes.map((bike) => bike.id));
  for (const id of bikeMotion.keys()) if (!liveBikeIds.has(id)) bikeMotion.delete(id);
  for (const bike of bikes) {
    const rideable = bike.getComponent("minecraft:rideable");
    if (!rideable) continue;
    const velocity = bike.getVelocity();
    const horizontalSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    updateLean(bike, horizontalSpeed);
    const speedKmh = Math.round(horizontalSpeed * TICK_RATE * 3.6);
    const gear = Math.max(1, Math.min(6, Math.floor(speedKmh / 25) + 1));
    const riders = rideable.getRiders();
    const moving = horizontalSpeed > 0.025;

    for (const player of riders) {
      currentRiders.add(player.id);
      const raceState = racers.get(player.id);
      if (raceRunning && raceState && !raceState.finished) activeRacers.push({ player, bike });
      if (hudTicks % HUD_INTERVAL_TICKS === 0) {
        const bikeLabel = bike.typeId.split(":")[1].replace("_bike", "").toUpperCase();
        const race = raceState ? `L${raceState.lap}/${MAX_LAPS} CP${raceState.checkpoint + 1}/${TRACK_CHECKPOINTS.length} ${formatTime(elapsedTicks)}` : "FREE RIDE";
        player.onScreenDisplay.setActionBar(`§6${bikeLabel}  ${speedKmh} km/h  §fG${gear}  §e${race}`);
      }
    }

    if (riders.length > 0 && moving) {
      if (hudTicks % 10 === 0) playSound(bike, "minecart.riding", { volume: Math.min(0.7, 0.2 + horizontalSpeed * 0.45), pitch: Math.min(1.7, 0.7 + horizontalSpeed * 1.5) });
      if (hudTicks % 8 === 0) {
        const rotation = bike.getRotation().y * Math.PI / 180;
        const rear = { x: bike.location.x - Math.sin(rotation) * 0.55, y: bike.location.y + 0.12, z: bike.location.z + Math.cos(rotation) * 0.55 };
        try { bike.dimension.spawnParticle("minecraft:basic_smoke_particle", rear); } catch { /* Cosmetic effect only. */ }
      }
      const gearBefore = lastGear.get(bike.id);
      if (gearBefore !== undefined && gearBefore !== gear) playSound(bike, "random.click", { volume: 0.3, pitch: gear > gearBefore ? 1.2 : 0.8 });
    }
    lastGear.set(bike.id, gear);
  }

  playRivalProximityCues(activeRacers);
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
