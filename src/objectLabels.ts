export type ObjectLabelInput = {
  id: string;
  text: string;
  x: number;
  y: number;
  priority?: number;
};

export type ObjectLabelPlacement = {
  dx: number;
  dy: number;
  visible: boolean;
};

type LabelBox = {left: number; right: number; top: number; bottom: number};

export function skyOverlayExclusions(root: HTMLElement | null): LabelBox[] {
  const workspace = root?.closest('.sky-workspace');
  if (!root || !workspace) return [];
  const origin = root.getBoundingClientRect();
  return [...workspace.querySelectorAll<HTMLElement>('.sky-statusbar,.quick-tools,.horizon-heading,.phone-notice,.object-preview,.finder-hud')]
    .filter(element => element.getClientRects().length > 0)
    .map(element => {
      const rect = element.getBoundingClientRect();
      return {left: rect.left - origin.left, right: rect.right - origin.left, top: rect.top - origin.top, bottom: rect.bottom - origin.top};
    });
}

const intersects = (a: LabelBox, b: LabelBox, gap = 5) =>
  a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;

/** Keep label text legible without moving or disabling its sky marker. */
export function layoutObjectLabels(labels: ObjectLabelInput[], width: number, height: number, exclusions: LabelBox[] = []) {
  const placements = new Map<string, ObjectLabelPlacement>();
  const placed: LabelBox[] = [];
  const ordered = [...labels].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const anchors = ordered.map(({id, x, y}) => ({id, box: {left: x - 7, right: x + 7, top: y - 7, bottom: y + 7}}));

  for (const label of ordered) {
    const labelWidth = Math.min(155, Math.max(18, [...label.text].length * 7.2 + 8));
    const labelHeight = 20;
    const side = labelWidth / 2 + 12;
    const options = [
      {dx: 0, dy: 32}, {dx: 0, dy: -32},
      {dx: side, dy: 0}, {dx: -side, dy: 0},
      {dx: side * .72, dy: 23}, {dx: -side * .72, dy: 23},
      {dx: side * .72, dy: -23}, {dx: -side * .72, dy: -23},
    ];
    let placement: ObjectLabelPlacement | undefined;
    for (const option of options) {
      const centerX = label.x + option.dx, centerY = label.y + option.dy;
      const box = {left: centerX - labelWidth / 2, right: centerX + labelWidth / 2, top: centerY - labelHeight / 2, bottom: centerY + labelHeight / 2};
      if (box.left < 6 || box.right > width - 6 || box.top < 6 || box.bottom > height - 6) continue;
      if (placed.some(other => intersects(box, other))) continue;
      if (exclusions.some(exclusion => intersects(box, exclusion, 0))) continue;
      if (anchors.some(anchor => anchor.id !== label.id && intersects(box, anchor.box, 3))) continue;
      placement = {...option, visible: true};
      placed.push(box);
      break;
    }
    placements.set(label.id, placement ?? {dx: 0, dy: 32, visible: false});
  }
  return placements;
}
