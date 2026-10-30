import {readFile, writeFile} from 'node:fs/promises';

let html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const licenses = await Promise.all(['vendor/MATTER-LICENSE.txt', 'vendor/LUCIDE-LICENSE.txt'].map(file => readFile(new URL(file, import.meta.url), 'utf8')));
html = html.replace('<head>', () => `<head>\n<!-- Third-party licenses\n${licenses.join('\n\n')}\n-->`);
const css = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
for (const file of ['vendor/matter.min.js', 'vendor/lucide.min.js', 'fruit-art.js', 'game.js']) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  html = html.replace(`<script defer src="${file}"></script>`, '');
  html = html.replace('</body>', () => `<script>\n${source.replaceAll('</script', '<\\/script')}\n</script>\n</body>`);
}
html = html.replace('href="./index.html"', 'href="./MelonFlow.html"');
await writeFile(new URL('./MelonFlow.html', import.meta.url), html);
console.log(`MelonFlow.html: ${Math.round(Buffer.byteLength(html) / 1024)} KB, fully offline.`);
