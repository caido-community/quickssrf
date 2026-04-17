import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "fs/promises";
import path from "path";

import { requireSDK } from "../sdk";

export function getBasePath(): string {
  const sdk = requireSDK();
  return sdk.meta.path();
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  // We can't use an ENOENT error check since
  // we are not in a true node vm and the error
  // returned by quickjs are not normalized
  if (!(await exists(filePath))) {
    return undefined;
  }

  const data = await readFile(filePath, "utf-8");
  return JSON.parse(data) as T;
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2));
  await rename(tempPath, filePath);
}

export async function deleteJson(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
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
