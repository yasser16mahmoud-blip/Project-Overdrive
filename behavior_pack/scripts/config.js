export const TICK_RATE = 20;
export const MAX_LAPS = 3;
export const HUD_INTERVAL_TICKS = 5;
export const CHECKPOINT_RADIUS = 6;

// Replace these sample points with checkpoint centers around your own circuit.
// Keep them ordered in the direction racers travel and near the road's Y level.
export const TRACK_CHECKPOINTS = [
  { x: 0, y: 64, z: 0, radius: CHECKPOINT_RADIUS },
  { x: 24, y: 64, z: 0, radius: CHECKPOINT_RADIUS },
  { x: 24, y: 64, z: 24, radius: CHECKPOINT_RADIUS },
  { x: 0, y: 64, z: 24, radius: CHECKPOINT_RADIUS }
];
