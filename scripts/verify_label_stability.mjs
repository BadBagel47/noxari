// Optional external Playwright, using the production UI and real input events.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const base = process.env.APP_URL || 'http://127.0.0.1:58982/noxari/';
const results = [], errors = [];
async function sample(page, selector) {
  return page.locator(`${selector} .sky-object-label`).evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect(), parent = element.parentElement;
    const point = parent.querySelector('.sky-point').getBoundingClientRect();
    return {id: parent.getAttribute('aria-label'), visible: element.dataset.visible === 'true',
      dx: element.style.left, dy: element.style.top,
      rect: {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom},
      pointError: Math.hypot(point.x + point.width / 2 - parseFloat(parent.style.left), point.y + point.height / 2 - parseFloat(parent.style.top))};
  }));
}
function remember(samples, memory) {
  for (const sample of samples) {
    assert.ok(sample.pointError < .1, 'marker moved away from astronomical anchor');
    const old = memory.get(sample.id);
    if (old) assert.deepEqual([sample.dx, sample.dy], old, 'label changed its anchored slot');
    if (sample.visible) memory.set(sample.id, [sample.dx, sample.dy]);
  }
}
function checkGeometry(samples, viewport) {
  const visible = samples.filter(sample => sample.visible);
  for (const {rect} of visible) {
    assert.ok(rect.left >= 0 && rect.top >= 0 && rect.right <= viewport.width && rect.bottom <= viewport.height, 'label clipped');
  }
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const a = visible[i].rect, b = visible[j].rect;
    assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'visible labels overlap');
  }
}
try {
  for (const viewport of [{width: 390, height: 844}, {width: 1280, height: 800}, {width: 568, height: 320}]) for (const language of ['en', 'sv']) {
    const page = await browser.newPage({viewport, hasTouch: true, reducedMotion: 'reduce'});
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-11-05T22:00:00Z'));
    await page.goto(`${base}?lang=${language}&skyRenderer=canvas`);
    await page.locator('.horizon-view canvas').waitFor();
    const memory = new Map();
    const initial = await sample(page, '.horizon-view'); remember(initial, memory); checkGeometry(initial, viewport);
    // Drag through a long pan, reverse, then oscillate around its starting point.
    const y = viewport.height * .52, x = viewport.width * .56;
    await page.mouse.move(x, y); await page.mouse.down();
    const microStates = new Map(), microToggles = new Map();
    let step = 0;
    for (const offset of [...Array.from({length: 36}, (_, i) => -(i + 1) * 5), ...Array.from({length: 36}, (_, i) => -175 + i * 5), ...Array.from({length: 12}, (_, i) => i % 2 ? -.2 : .2)]) {
      await page.mouse.move(x + offset, y);
      await page.waitForTimeout(20);
      const frame = await sample(page, '.horizon-view'); remember(frame, memory); checkGeometry(frame, viewport);
      if (step++ >= 72) {
        const current = new Map(frame.map(label => [label.id, label.visible]));
        for (const id of new Set([...microStates.keys(), ...current.keys()])) {
          const visible = current.get(id) ?? false;
          if (microStates.has(id) && microStates.get(id) !== visible) microToggles.set(id, (microToggles.get(id) ?? 0) + 1);
          assert.ok((microToggles.get(id) ?? 0) <= 1, 'subpixel oscillation made a name blink repeatedly');
          microStates.set(id, visible);
        }
      }
    }
    await page.mouse.up();
    assert.ok(memory.size > 0, 'no label continuity was checked');
    const more = language === 'sv' ? 'Mer' : 'More', display = language === 'sv' ? 'Himmelsvy' : 'Sky display';
    await page.getByRole('button', {name: more, exact: true}).click();
    await page.getByRole('button', {name: display, exact: true}).click();
    await page.getByRole('button', {name: language === 'sv' ? 'Himmelskarta' : 'Sky map', exact: true}).click();
    await page.getByRole('button', {name: language === 'sv' ? 'Stäng panel' : 'Close panel', exact: true}).click();
    const mapMemory = new Map();
    remember(await sample(page, '.sky-map'), mapMemory);
    const client = await page.context().newCDPSession(page), cy = viewport.height * .5, cx = viewport.width * .55;
    await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: cx - 30, y: cy, id: 1}, {x: cx + 30, y: cy, id: 2}]});
    for (const distance of [40, 50, 65, 80, 65, 50, 40, 30]) {
      await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: cx - distance, y: cy, id: 1}, {x: cx + distance, y: cy, id: 2}]});
      await page.waitForTimeout(30);
      const frame = await sample(page, '.sky-map'); remember(frame, mapMemory); checkGeometry(frame, viewport);
    }
    await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await client.detach();
    const visibleLabel = page.locator('button.sky-object .sky-object-label[data-visible="true"]').first();
    await visibleLabel.click();
    assert.equal(await page.locator('.object-preview').count(), 1);
    assert.equal(await page.locator('button.sky-object.is-selected').getAttribute('aria-pressed'), 'true');
    results.push({viewport, language, pass: true, horizonTracked: memory.size, mapTracked: mapMemory.size, maxMicroVisibilityChanges: Math.max(0, ...microToggles.values())});
    console.log('PASS', viewport.width, viewport.height, language);
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  writeFileSync(process.env.QA_OUTPUT || '/tmp/noxari-label-stability.json', JSON.stringify({results, errors}, null, 2));
  await browser.close();
}
