/* eslint-disable compat/compat */
import { vi } from "vitest";

const fileSystem = new Map<string, string>();

export function createMockFs() {
  fileSystem.clear();

  return {
    readFile: vi.fn((path: string) => {
      const content = fileSystem.get(path);
      if (content === undefined) {
        return Promise.reject(new Error(`ENOENT: ${path}`));
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, data: string) => {
      fileSystem.set(path, data);
      return Promise.resolve();
    }),
    readdir: vi.fn((path: string) => {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      const files: string[] = [];
      for (const key of fileSystem.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          if (!rest.includes("/")) files.push(rest);
        }
      }
      return Promise.resolve(files);
    }),
    mkdir: vi.fn(() => Promise.resolve()),
    rm: vi.fn((path: string) => {
      fileSystem.delete(path);
      return Promise.resolve();
    }),
    _store: fileSystem,
  };
}
