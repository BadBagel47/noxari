import {AstroTime, Observer, RotateVector, Rotation_EQD_EQJ, Rotation_EQJ_HOR, Spherical, VectorFromSphere} from 'astronomy-engine';
import type {ObservingLocation, SkyPosition} from './astronomy';
import {constellationBoundaries, type BoundaryEdge} from './generated/boundaries';
import type {MapPoint} from './skyProjection';

// Same Besselian epoch and frame convention as Astronomy Engine's Constellation.
// Boundaries are fixed coordinate areas, so stellar proper motion is not applied.
const epoch1875 = new AstroTime(-45655.74141261017);
const toJ2000 = Rotation_EQD_EQJ(epoch1875);
const DEG = 180 / Math.PI;

// A constant-declination boundary is a small circle, not a great-circle chord.
// Sample in the source frame, retaining P+ direction across RA=24h and at poles.
export function boundarySamples(edge: BoundaryEdge) {
  const [ra1, dec1, ra2, dec2] = edge;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(ra2 - ra1) * 15, Math.abs(dec2 - dec1))));
  return Array.from({length: steps + 1}, (_, i) => ({ra: ra1 + (ra2 - ra1) * i / steps, dec: dec1 + (dec2 - dec1) * i / steps}));
}

let equatorial: ReturnType<typeof makeEquatorial> | undefined;
function makeEquatorial() {
  return constellationBoundaries.map(edge => boundarySamples(edge).map(({ra, dec}) =>
    RotateVector(toJ2000, VectorFromSphere(new Spherical(dec, ra * 15, 1), epoch1875))));
}

// Cached by each view for time/location; phone motion only reprojects these arcs.
export function boundarySky(time: Date, location: ObservingLocation): SkyPosition[][] {
  equatorial ??= makeEquatorial();
  const rotation = Rotation_EQJ_HOR(time, new Observer(location.latitude, location.longitude, 0));
  return equatorial.map(arc => arc.map(vector => {
    const v = RotateVector(rotation, vector);
    return {altitude: Math.atan2(v.z, Math.hypot(v.x, v.y)) * DEG, azimuth: (Math.atan2(-v.y, v.x) * DEG + 360) % 360};
  }));
}

// Projected segments are clipped to the viewport; a null sample breaks a path
// at the geometric horizon or behind the camera instead of joining across it.
export function drawBoundaries(context: CanvasRenderingContext2D, arcs: SkyPosition[][], project: (position: SkyPosition) => MapPoint | null, width: number, height: number, visibility: number) {
  if (visibility <= 0) return;
  context.save();
  context.beginPath(); context.rect(0, 0, width, height); context.clip();
  context.globalAlpha = visibility * .65;
  context.strokeStyle = '#c1a4d9'; context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  for (const arc of arcs) {
    let connected = false;
    for (const sample of arc) {
      const point = project(sample);
      if (!point) { connected = false; continue; }
      if (connected) context.lineTo(point.x, point.y);
      else context.moveTo(point.x, point.y);
      connected = true;
    }
  }
  context.stroke();
  context.restore();
}
