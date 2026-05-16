import { App, TFile } from 'obsidian';
import { format } from 'date-fns';
import { IMatterData, ISafeAny } from './types';

export function openWithBrowser(
  url: string,
  queryParams: Record<string, undefined | number | string> = {},
): void {
  window.open(`${url}?${generateQueryString(queryParams)}`);
}

export function generateQueryString(params: Record<string, undefined | number | string>): string {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== undefined)) as Record<
      string,
      string
    >,
  ).toString();
}

export function isPromiseFulfilledResult<T>(obj: ISafeAny): obj is PromiseFulfilledResult<T> {
  return !!obj && obj.status === 'fulfilled' && obj.value;
}

export function isValidUrl(url: string): boolean {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
}

export function isValidBloggerUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('.blogspot.com');
  } catch (e) {
    return false;
  }
}

export function getBoundary(): string {
  return `----obsidianBoundary${format(new Date(), 'yyyyMMddHHmmss')}`;
}

export async function processFile(
  file: TFile,
  app: App,
): Promise<{ content: string; matter: IMatterData }> {
  let fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) {
    await app.fileManager.processFrontMatter(file, (matter: IMatterData) => {
      fm = matter;
    });
  }
  const raw = await app.vault.read(file);
  return {
    content: raw.replace(/^---[\s\S]+?---/, '').trim(),
    matter: fm ?? {},
  };
}
