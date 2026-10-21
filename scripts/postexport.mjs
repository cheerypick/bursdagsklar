// After `expo export --platform web`:
// - copy index.html to 404.html so GitHub Pages serves the app for deep links
//   such as /bursdagsklar/plan (Pages has no SPA fallback);
// - add .nojekyll so folders that start with "_" (Expo's _expo/) are served.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const index = join(dir, 'index.html');
if (!existsSync(index)) {
  console.error(`postexport: ${index} not found`);
  process.exit(1);
}
copyFileSync(index, join(dir, '404.html'));
writeFileSync(join(dir, '.nojekyll'), '');
console.log(`postexport: wrote ${join(dir, '404.html')} and .nojekyll`);
