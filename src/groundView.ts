// Shared by touch, keyboard, manual controls and sensor publication. Keeping a
// tiny margin at the poles avoids a singular horizon tangent.
export const clampViewPitch = (pitch: number) => Math.max(-89.9, Math.min(89.9, pitch));

export function groundOpacity(pitch: number) {
  const t = Math.max(0, Math.min(1, -pitch / 25));
  return 1 - t * t * (3 - 2 * t);
}
