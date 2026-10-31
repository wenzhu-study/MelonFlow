import {readFile, stat} from 'node:fs/promises';
import assert from 'node:assert/strict';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const [source, bundle, css, art, audio] = await Promise.all([
  read('index.html'), read('MelonFlow.html'), read('styles.css'), read('fruit-art.js'), read('game-audio.js'),
]);
const scripts = ['vendor/matter.min.js', 'vendor/lucide.min.js', 'fruit-art.js', 'game-audio.js', 'game.js'];

assert.match(source, /<link rel="icon"[^>]+href="favicon\.svg"/);
assert.match(bundle, /<link rel="icon"[^>]+href="data:image\/svg\+xml;base64,/);
assert.doesNotMatch(bundle, /<script[^>]+src=|<link[^>]+rel="stylesheet"/);
assert.match(bundle, /<style>[\s\S]*<\/style>/);
assert.match(bundle, /window\.FruitArt/);
assert.match(bundle, /window\.MelonAudio/);
assert.match(bundle, /\/\* Pastel artwork follows/);
assert.ok(css.length > 1000 && art.length > 1000 && audio.length > 1000);
for (const name of scripts) {
  const file = await read(name);
  assert.ok(bundle.includes(file), `${name} is missing from the standalone game`);
  assert.ok((await stat(new URL(name, import.meta.url))).size > 0);
}
assert.ok((await stat(new URL('preview.png', import.meta.url))).size > 10000);
console.log('Standalone game embeds all scripts, styles and icon; source assets and preview exist.');
