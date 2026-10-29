import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatBps(bps: number): string {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1_000_000) return `${(bps / 1000).toFixed(1)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
