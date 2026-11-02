// Store Settings logo save path. Offline.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports }, { filename });
  return module.exports;
}

const { sanitizeStoreLogoSvg } = load('features/keystone/utils/storeLogo.ts');
const { normalizeStoreLogoColor } = load('features/lib/store-logo.ts');
const { LOGO_ICONS } = load('features/platform/store-settings/lib/icon-registry.ts');

test('the action sanitizes, normalizes, saves and revalidates', () => {
  const src = fs.readFileSync(path.join(root, 'features/platform/store-settings/actions/store-settings.ts'), 'utf8');
  const a = src.indexOf('sanitizeStoreLogoSvg(submitted)');
  const b = src.indexOf('normalizeStoreLogoColor(value(data');
  const c = src.indexOf('updateConstructionStoreSettings(');
  assert.ok(a > 0 && b > a && c > 0 && c < a, 'sanitize then normalize, inside the save call');
  assert.match(src, /revalidatePath\("\/", "layout"\)/);
});
test('every preset survives the sanitizer', () => { for (const icon of LOGO_ICONS) assert.ok(sanitizeStoreLogoSvg(icon.lightSvg), icon.id); });
test('hue is normalized to 0-359', () => {
  assert.equal(normalizeStoreLogoColor('390'), '30');
  assert.equal(normalizeStoreLogoColor('-30'), '330');
  assert.equal(normalizeStoreLogoColor('x'), '0');
});
test('custom SVG kept, unsafe SVG rejected', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path d="M0 0h8v8z"/></svg>';
  assert.equal(sanitizeStoreLogoSvg(`  ${svg}\n`), svg);
  assert.equal(sanitizeStoreLogoSvg('<svg onload="x()"></svg>'), '');
  assert.equal(sanitizeStoreLogoSvg('<svg><script>1</script></svg>'), '');
});
