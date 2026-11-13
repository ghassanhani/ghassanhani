// Measures the widest line of every Madinah page in its QCF4 font (layout data only: how large
// the glyphs can be drawn so a page fills the screen width). Needs Playwright and the fonts
// (npm install). Run: node pipeline/importers/qcf4/measure-lines.cjs
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '../../..');
const FONTS = path.join(ROOT, 'assets/fonts/qcf4');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/content/qcf4-pages.json'), 'utf8'));
const srv = http.createServer((q, r) => { fs.readFile(path.join(FONTS, path.basename(q.url)), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); r.end(d); }); }).listen(8098);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const pages = Array.from({length: 604}, (_, i) => i + 1);
  const fams = [...new Set(pages.map(n => data.pages[n - 1].f))];
  const files = fs.readdirSync(FONTS);
  const css = fams.map(f => { const file = files.find(x => x.replace(/(_W)?\.ttf$/, '') === f); return `@font-face{font-family:'${f}';src:url('http://localhost:8098/${file}')}`; }).join('');
  await p.setContent(`<style>${css}</style>` + fams.map(f => `<span style="font-family:'${f}'">x</span>`).join(''));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  const out = await p.evaluate(({ data, pages }) => {
    const res = {};
    for (const n of pages) {
      const pg = data.pages[n - 1];
      const ws = [];
      for (const l of pg.l) if (l.g) {
        const s = document.createElement('span'); s.style.fontFamily = pg.f; s.style.fontSize = '100px'; s.style.whiteSpace = 'pre'; s.textContent = l.g; document.body.appendChild(s);
        const marks = l.i.filter((x) => x === -1).length;
        ws.push([+(s.getBoundingClientRect().width / 100).toFixed(2), marks]); s.remove();
      }
      res[n] = ws;
    }
    return res;
  }, { data, pages });
  const widest = Array.from({ length: 604 }, (_, i) => Math.max(...out[i + 1].map((w) => w[0])));
  fs.writeFileSync(path.join(ROOT, 'assets/content/qcf4-line-em.json'), JSON.stringify({ _note: 'Widest line of each Madinah page in its QCF4 font, in em (index = page - 1). Measured by pipeline/importers/qcf4 (measure-lines) from the font files; layout only.', em: widest.map((w) => +w.toFixed(2)) }));
  console.log('min', Math.min(...widest), 'max', Math.max(...widest));
  await b.close(); srv.close();
})();
