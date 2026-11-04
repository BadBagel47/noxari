import {prepareHorizontalDirections, type PreparedHorizontalDirection} from './skyProjection';

// Only two bounded sets of fixed horizontal curves; camera movement reprojects.
const grids = new Map<boolean, PreparedHorizontalDirection[][]>();
export function horizonGrid(belowHorizon: boolean) {
  let curves = grids.get(belowHorizon);
  if (!curves) {
    curves = [];
    for (const altitude of belowHorizon ? [-60, -30, 0, 15, 30, 60] : [15, 30, 60]) {
      curves.push(prepareHorizontalDirections(Array.from({length: 361}, (_, azimuth) => ({altitude, azimuth}))));
    }
    for (let azimuth = 0; azimuth < 360; azimuth += 30) {
      curves.push(prepareHorizontalDirections(Array.from({length: belowHorizon ? 181 : 91}, (_, i) => ({altitude: i - (belowHorizon ? 90 : 0), azimuth}))));
    }
    grids.set(belowHorizon, curves);
  }
  return curves;
}
