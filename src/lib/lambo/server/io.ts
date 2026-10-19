/**
 * Server-only filesystem helpers shared by the pipeline scripts and the Next.js server.
 * Never import from client components.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync, fsyncSync, openSync, closeSync } from "node:fs";
import path from "node:path";

export function repoRoot(): string {
  return process.env.LAMBO_ROOT ? path.resolve(process.env.LAMBO_ROOT) : process.cwd();
}

export function resolveFromRoot(...parts: string[]): string {
  return path.join(repoRoot(), ...parts);
}

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function readJsonIfExists<T = unknown>(file: string): T | null {
  return existsSync(file) ? readJson<T>(file) : null;
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function sha256File(file: string): string {
  return sha256(readFileSync(file));
}

/** Deterministic JSON: object keys sorted, so equal content hashes equally. */
export function stableStringify(value: unknown, space?: number): string {
  return JSON.stringify(sortKeys(value), null, space);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

/** Writes through a temporary file and an atomic rename, so readers never see a partial file. */
export function writeFileAtomic(file: string, data: string | Buffer): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, data);
  const fd = openSync(tmp, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}

export function writeJsonAtomic(file: string, value: unknown, space = 1): void {
  writeFileAtomic(file, JSON.stringify(value, null, space) + "\n");
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
