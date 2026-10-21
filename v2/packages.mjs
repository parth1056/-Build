import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export function supportedOnLinuxX64(entry) {
  const allows = (list, value) => !list || (!list.includes(`!${value}`) && (!list.some(item => !item.startsWith('!')) || list.includes(value)));
  return allows(entry.os, 'linux') && allows(entry.cpu, 'x64');
}
export function archiveName(url) { return createHash('sha256').update(url).digest('hex') + '.tgz'; }
export function rewriteLockfile(lock) {
  const copy = structuredClone(lock);
  for (const entry of Object.values(copy.packages)) {
    if (entry.resolved?.startsWith('https://registry.npmjs.org/') && supportedOnLinuxX64(entry)) entry.resolved = `file:/packages/${archiveName(entry.resolved)}`;
  }
  return copy;
}
export async function preparePackages(lockfile, directory) {
  const lock = JSON.parse(await readFile(lockfile, 'utf8'));
  await mkdir(directory, { recursive: true });
  const packages = [...new Map(Object.values(lock.packages)
    .filter(entry => entry.resolved?.startsWith('https://registry.npmjs.org/') && supportedOnLinuxX64(entry))
    .map(entry => [entry.resolved, entry])).values()];
  let index = 0;
  const manifest = [];
  async function worker() {
    while (index < packages.length) {
      const entry = packages[index++];
      if (!entry.integrity?.startsWith('sha512-')) throw new Error(`Missing SHA-512 package integrity: ${entry.resolved}`);
      const filename = archiveName(entry.resolved), file = join(directory, filename);
      let bytes;
      try { bytes = await readFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!bytes) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch(entry.resolved, { signal: AbortSignal.timeout(30_000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            bytes = Buffer.from(await response.arrayBuffer()); break;
          } catch (error) { if (attempt === 3) throw new Error(`Could not stage ${entry.resolved}`, { cause: error }); }
        }
      }
      const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
      if (integrity !== entry.integrity) throw new Error(`Package integrity mismatch: ${entry.resolved}`);
      await writeFile(file, bytes);
      manifest.push({ url: entry.resolved, filename, integrity, bytes: bytes.length });
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  let previous = [];
  try { previous = JSON.parse(await readFile(join(directory, 'package-inputs.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const combined = new Map(previous.map(entry => [entry.url, entry]));
  for (const entry of manifest) combined.set(entry.url, entry);
  const inputs = [...combined.values()].sort((a, b) => a.url.localeCompare(b.url));
  await writeFile(join(directory, 'package-inputs.json'), JSON.stringify(inputs, null, 2) + '\n');
  return { count: inputs.length, inputHash: createHash('sha256').update(JSON.stringify(inputs)).digest('hex') };
}
