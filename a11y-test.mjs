import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to NexoMente...');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  
  // Inject axe from CDN
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js' });
  await page.waitForFunction(() => typeof window.axe !== 'undefined', { timeout: 10000 });
  
  // Axe analysis
  const violations = await page.evaluate(() => {
    return new Promise((resolve) => {
      window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice', 'cat.keyboard', 'cat.focus', 'cat.name-role-value']
      }, (err, results) => {
        if (err) { resolve({ error: err.message }); return; }
        resolve({
          violations: results.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            help: v.help,
            nodes: v.nodes.length,
            nodeDetails: v.nodes.slice(0, 3).map(n => ({
              html: n.html.slice(0, 200),
              target: n.target.join(', ').slice(0, 100)
            }))
          })),
          passes: results.passes.length
        });
      });
    });
  });

  // Keyboard navigation check
  const keyboardCheck = await page.evaluate(() => {
    const issues = [];
    
    // Check: divs with onClick but not button/anchor
    document.querySelectorAll('[onclick]').forEach(el => {
      if (!['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && el.getAttribute('onclick')) {
        const tag = el.tagName;
        const text = el.textContent?.trim().slice(0, 50) || '(empty)';
        const classes = el.className?.slice(0, 60) || '';
        issues.push({ type: 'non-keyboard-element', tag, text, classes });
      }
    });
    
    // Check: inputs without labels
    document.querySelectorAll('input:not([id]), input[id=""]').forEach(input => {
      const id = input.id || '(no id)';
      const type = input.type || 'text';
      const placeholder = input.placeholder || '';
      const hasLabel = document.querySelector(`label[for="${id}"]`) !== null;
      if (!hasLabel && placeholder) {
        issues.push({ type: 'input-no-label', id, type, placeholder: placeholder.slice(0, 40) });
      }
    });
    
    // Check: buttons without text
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() || '';
      const ariaLabel = btn.getAttribute('aria-label') || '';
      if (!text && !ariaLabel) {
        issues.push({ type: 'button-no-label', classes: btn.className?.slice(0, 60) });
      }
    });
    
    // Check: focus-visible CSS
    const sheets = [...document.styleSheets];
    const focusRules = [];
    sheets.forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => {
          if (rule.cssText && (rule.cssText.includes(':focus') || rule.cssText.includes(':focus-visible'))) {
            focusRules.push(rule.cssText.slice(0, 150));
          }
        });
      } catch(e) {}
    });
    
    return { issues, focusRules };
  });

  // Tab order check
  await page.keyboard.press('Tab');
  const firstFocused = await page.evaluate(() => {
    const el = document.activeElement;
    return { tag: el.tagName, text: el.textContent?.trim().slice(0, 50), id: el.id, class: el.className?.slice(0, 60) };
  });

  await browser.close();
  
  console.log('\n## KEYBOARD + WCAG ACCESSIBILITY REPORT\n');
  
  if (violations.error) {
    console.log('Axe error:', violations.error);
  } else {
    console.log(`WCAG Violations: ${violations.violations.length} | Passes: ${violations.passes}`);
    violations.violations.forEach(v => {
      console.log(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes} nodes)`);
      v.nodeDetails?.forEach(n => {
        console.log(`    → ${n.target} | ${n.html}`);
      });
    });
  }
  
  console.log('\nKeyboard Navigation Issues:');
  keyboardCheck.issues.forEach(i => {
    console.log(`  [${i.type}] tag=${i.tag || i.type} text="${i.text || i.placeholder || i.id || i.classes}"`);
  });
  
  console.log('\nFocus CSS Rules found:', keyboardCheck.focusRules.length);
  keyboardCheck.focusRules.slice(0, 5).forEach(r => console.log(' ', r));
  
  console.log('\nFirst Tab target:', firstFocused);
  
  // Summary
  const crit = violations.violations?.filter(v => v.impact === 'critical').length || 0;
  const ser = violations.violations?.filter(v => v.impact === 'serious').length || 0;
  const mod = violations.violations?.filter(v => v.impact === 'moderate').length || 0;
  console.log(`\n## SUMMARY`);
  console.log(`Critical violations: ${crit} | Serious: ${ser} | Moderate: ${mod}`);
  console.log(`Keyboard-only issues: ${keyboardCheck.issues.length}`);
  console.log(`Has focus CSS: ${keyboardCheck.focusRules.length > 0 ? 'YES' : 'NO'}`);
}

main().catch(e => { console.error(e); process.exit(1); });