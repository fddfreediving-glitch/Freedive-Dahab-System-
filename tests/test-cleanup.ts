import { rmSync } from 'node:fs';

// Windows can keep freshly closed SQLite files locked by antivirus or the
// search indexer, so a failed cleanup must not turn a passing suite red.
export async function removeTemporaryDirectory(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      rmSync(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(String(code))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  console.warn(`Temporary test directory could not be removed: ${directory}`);
}
