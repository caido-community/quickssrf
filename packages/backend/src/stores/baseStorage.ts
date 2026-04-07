import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import { requireSDK } from "../sdk";

export function getBasePath(): string {
  const sdk = requireSDK();
  return sdk.meta.path();
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function deleteJson(filePath: string): Promise<void> {
  try {
    await rm(filePath);
    // eslint-disable-next-line no-empty
  } catch {}
}

export async function listJsonFiles<T>(
  dirPath: string,
): Promise<{ file: string; data: T }[]> {
  try {
    const files = await readdir(dirPath);
    const results: { file: string; data: T }[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await readJson<T>(path.join(dirPath, file));
      if (data !== undefined) {
        results.push({ file, data });
      }
    }

    return results;
  } catch {
    return [];
  }
}
