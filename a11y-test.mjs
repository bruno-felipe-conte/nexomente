import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Navigating...');
try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
} catch(e) {
  console.error('Nav failed:', e.message);
  await browser.close();
  process.exit(1);
}

await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js' });
await page.waitForFunction(() => typeof window.axe !== 'undefined', { timeout: 10000 });

const results = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice', 'cat.keyboard', 'cat.focus', 'cat.name-role-value'] }
    }, (err, data) => {
      if (err) { resolve({ error: err.message }); return; }
      const vlist = data.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
        nodeDetails: v.nodes.slice(0, 3).map(n => ({
          target: (n.target || []).join(', ').slice(0, 100),
          html: n.html.slice(0, 200)
        }))
      }));
      resolve({ violations: vlist, passes: data.passes.length });
    });
  });
});

const keyboard = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    const issues = [];
    const safe = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];

    document.querySelectorAll('[onclick]').forEach(el => {
      if (!safe.includes(el.tagName) && el.getAttribute('onclick')) {
        issues.push({ type: 'non-keyboard', tag: el.tagName, text: (el.textContent || '').trim().slice(0, 50) || '(empty)', cls: (el.className || '').slice(0, 60) });
      }
    });

    document.querySelectorAll('button').forEach(btn => {
      if (!(btn.textContent || '').trim() && !btn.getAttribute('aria-label')) {
        issues.push({ type: 'button-no-label', cls: (btn.className || '').slice(0, 60) });
      }
    });

    const sheets = Array.from(document.styleSheets);
    const focusRules = [];
    sheets.forEach(sheet => {
      try {
        Array.from(sheet.cssRules || []).forEach(rule => {
          if (rule.cssText && (rule.cssText.includes(':focus'))) {
            focusRules.push(rule.cssText.slice(0, 150));
          }
        });
      } catch(e) {}
    });

    resolve({ issues, focusRules });
  });
});

await page.keyboard.press('Tab');
const firstTab = await page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 50), id: el.id };
});

await browser.close();

const crit = results.violations.filter(v => v.impact === 'critical').length;
const ser = results.violations.filter(v => v.impact === 'serious').length;
const mod = results.violations.filter(v => v.impact === 'moderate').length;
const kb = keyboard.issues.length;
const hasFocus = keyboard.focusRules.length > 0;

console.log('\n======== KEYBOARD + WCAG REPORT ========\n');
if (results.error) {
  console.log('Axe error:', results.error);
} else {
  console.log(`WCAG violations: ${results.violations.length} | Passes: ${results.passes}`);
  console.log(`  Critical: ${crit} | Serious: ${ser} | Moderate: ${mod}`);
  results.violations.forEach(v => {
    console.log(`  [${v.impact}] ${v.id}: ${v.description.slice(0, 80)} (${v.nodes} nodes)`);
    v.nodeDetails.forEach(n => console.log(`    -> ${n.target} | ${n.html}`));
  });
}
console.log(`\nKeyboard issues: ${kb}`);
keyboard.issues.forEach(i => {
  if (i.type === 'non-keyboard') console.log(`  [NON-KEYBOARD] <${i.tag}> "${i.text}" cls="${i.cls}"`);
  else console.log(`  [${i.type}] cls="${i.cls}"`);
});
console.log(`\nHas :focus CSS: ${hasFocus ? 'YES (' + keyboard.focusRules.length + ')' : 'NO'}`);
keyboard.focusRules.slice(0, 3).forEach(r => console.log('  ' + r));
console.log(`\nFirst Tab target: <${firstTab.tag}> "${firstTab.text}" id="${firstTab.id}"`);
const score = (results.violations.length === 0 ? 10 : crit > 0 ? 4 : ser > 0 ? 6 : 8) - Math.min(3, kb) - (hasFocus ? 0 : 2);
console.log(`\nScore: ${score}/10`);