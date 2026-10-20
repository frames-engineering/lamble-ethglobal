/**
 * Writer locks. Jobs in the same writerGroup (docs/data/jobs.json) take the same lock file, so the daily
 * release and the weekly edition never write at the same time. A lock older than its TTL is treated as left
 * behind by a crashed job and taken over, with a warning.
 */
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import path from "node:path";

import { resolveFromRoot } from "../../src/lib/lamble/server/io.ts";

export class LockBusyError extends Error {}

export function withLock<T>(group: string, fn: () => T, ttlSeconds = 30 * 60): T {
  const release = acquireLock(group, ttlSeconds);
  try {
    return fn();
  } finally {
    release();
  }
}

/** Holds the lock until the promise settles (withLock would release when an async body returns its promise). */
export async function withLockAsync<T>(group: string, fn: () => Promise<T>, ttlSeconds = 30 * 60): Promise<T> {
  const release = acquireLock(group, ttlSeconds);
  try {
    return await fn();
  } finally {
    release();
  }
}

function acquireLock(group: string, ttlSeconds: number): () => void {
  const dir = process.env.LAMBLE_LOCK_DIR ?? resolveFromRoot("data/locks");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${group}.lock`);
  const acquire = () => {
    const fd = openSync(file, "wx");
    writeSync(fd, JSON.stringify({ pid: process.pid, at: Math.floor(Date.now() / 1000) }));
    closeSync(fd);
  };
  try {
    acquire();
  } catch {
    let holder: { pid: number; at: number } | null = null;
    try {
      holder = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      holder = null;
    }
    const age = holder ? Math.floor(Date.now() / 1000) - holder.at : Infinity;
    if (age < ttlSeconds) throw new LockBusyError(`lock ${group} held by pid ${holder?.pid} for ${age}s`);
    console.warn(`taking over stale lock ${group} (age ${age}s)`);
    rmSync(file, { force: true });
    acquire();
  }
  return () => rmSync(file, { force: true });
}
