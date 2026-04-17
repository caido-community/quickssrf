/* eslint-disable compat/compat */
import { vi } from "vitest";

const fileSystem = new Map<string, string>();

export function createMockFs() {
  fileSystem.clear();

  return {
    access: vi.fn((path: string) => {
      if (!fileSystem.has(path)) {
        const err = new Error(`ENOENT: ${path}`) as Error & { code: string };
        err.code = "ENOENT";
        return Promise.reject(err);
      }
      return Promise.resolve();
    }),
    readFile: vi.fn((path: string) => {
      const content = fileSystem.get(path);
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, data: string) => {
      fileSystem.set(path, data);
      return Promise.resolve();
    }),
    rename: vi.fn((oldPath: string, newPath: string) => {
      const content = fileSystem.get(oldPath);
      if (content !== undefined) {
        fileSystem.set(newPath, content);
        fileSystem.delete(oldPath);
      }
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
