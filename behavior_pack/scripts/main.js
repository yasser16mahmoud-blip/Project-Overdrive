import { system, world } from "@minecraft/server";
import { HUD_INTERVAL_TICKS, MAX_LAPS, TICK_RATE, TRACK_CHECKPOINTS } from "./config.js";

const bikeType = "overdrive:racer_bike";
const racers = new Map();
let raceRunning = false;
let countdown = 0;
let elapsedTicks = 0;
let hudTicks = 0;

function formatTime(ticks) {
  const seconds = ticks / TICK_RATE;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function riderIds() {
  const ids = new Set();
  for (const bike of world.getDimension("overworld").getEntities({ type: bikeType })) {
    const rideable = bike.getComponent("minecraft:rideable");
    if (!rideable) continue;
    for (const rider of rideable.getRiders()) ids.add(rider.id);
  }
  return ids;
}

function sayToRacers(message) {
  for (const player of world.getPlayers()) {
    if (racerIds().has(player.id)) player.sendMessage(`§6[OVERDRIVE]§r ${message}`);
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
  for (const player of world.getPlayers()) {
    if (riderIds().has(player.id)) {
      racers.set(player.id, { lap: 1, checkpoint: 0, finished: false });
    }
  }
  if (racers.size === 0) {
    world.sendMessage("§c[OVERDRIVE] Mount a racer bike before starting the race.");
    countdown = 0;
    return;
  }
  world.sendMessage("§e[OVERDRIVE] Race starts in 3...");
  system.runTimeout(() => {
    if (countdown === 0) return;
    world.sendMessage("§e[OVERDRIVE] 2...");
  }, TICK_RATE);
  system.runTimeout(() => {
    if (countdown === 0) return;
    world.sendMessage("§e[OVERDRIVE] 1...");
  }, TICK_RATE * 2);
  system.runTimeout(() => {
    if (countdown === 0) return;
    countdown = 0;
    raceRunning = true;
    world.sendMessage("§a[OVERDRIVE] GO!");
  }, TICK_RATE * 3);
}

function resetRace() {
  raceRunning = false;
  countdown = 0;
  elapsedTicks = 0;
  racers.clear();
  world.sendMessage("§7[OVERDRIVE] Race state reset.");
}

world.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id !== "overdrive:race") return;
  const action = event.message.trim().toLowerCase();
  if (action === "start") startRace();
  else if (action === "reset") resetRace();
  else event.sourceEntity?.sendMessage("§eUse /scriptevent overdrive:race start or /scriptevent overdrive:race reset");
});

system.runInterval(() => {
  const bikes = world.getDimension("overworld").getEntities({ type: bikeType });
  const currentRiders = new Set();
  for (const bike of bikes) {
    const rideable = bike.getComponent("minecraft:rideable");
    if (!rideable) continue;
    const velocity = bike.getVelocity();
    const speedKmh = Math.round(Math.sqrt(velocity.x ** 2 + velocity.z ** 2) * TICK_RATE * 3.6);
    for (const player of rideable.getRiders()) {
      currentRiders.add(player.id);
      if (hudTicks % HUD_INTERVAL_TICKS === 0) {
        const state = racers.get(player.id);
        const gear = Math.max(1, Math.min(6, Math.floor(speedKmh / 25) + 1));
        const raceText = state
          ? `LAP ${state.lap}/${MAX_LAPS}  CP ${state.checkpoint + 1}/${TRACK_CHECKPOINTS.length}  ${formatTime(elapsedTicks)}`
          : "FREE RIDE";
        player.onScreenDisplay.setActionBar(`§6${speedKmh} km/h  §fG${gear}  §e${raceText}`);
      }
    }
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
      if (state.checkpoint < TRACK_CHECKPOINTS.length) {
        player.sendMessage(`§b[OVERDRIVE] Checkpoint ${state.checkpoint}/${TRACK_CHECKPOINTS.length}`);
        continue;
      }
      state.checkpoint = 0;
      if (state.lap >= MAX_LAPS) {
        state.finished = true;
        player.sendMessage(`§a[OVERDRIVE] Finished in ${formatTime(elapsedTicks)}!`);
        continue;
      }
      state.lap++;
      player.sendMessage(`§e[OVERDRIVE] Lap ${state.lap}/${MAX_LAPS} — ${formatTime(elapsedTicks)}`);
    }
    if ([...racers.values()].every((state) => state.finished)) {
      raceRunning = false;
      world.sendMessage("§6[OVERDRIVE] Race complete. Use /scriptevent overdrive:race start to race again.");
    }
  }
  hudTicks++;
}, 1);
