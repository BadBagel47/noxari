const RAD = Math.PI / 180;
const MAS = RAD / 3_600_000;
export const yearsSinceJ2000 = (time: Date) => (time.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400_000);

// First-order angular proper motion in the J2000 tangent plane. HYG/Hipparcos
// pmRA includes cos(dec). Normalizing avoids dividing by cos(dec) near a pole.
// Radial velocity, perspective acceleration and annual parallax are omitted.
export function movingStarVector(raHours: number, decDegrees: number, pmRaCosDec = 0, pmDec = 0, years = 0) {
  const ra = raHours * 15 * RAD, dec = decDegrees * RAD;
  const east = pmRaCosDec * MAS * years, north = pmDec * MAS * years;
  const x = Math.cos(dec) * Math.cos(ra) - east * Math.sin(ra) - north * Math.sin(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra) + east * Math.cos(ra) - north * Math.sin(dec) * Math.sin(ra);
  const z = Math.sin(dec) + north * Math.cos(dec);
  const length = Math.hypot(x, y, z);
  return {x: x / length, y: y / length, z: z / length};
}
