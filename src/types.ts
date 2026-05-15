export type SafeAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Brand<K, T> = K & { __brand: T };

export type MatterData = { [p: string]: SafeAny };

export interface Media {
  mimeType: string;
  fileName: string;
  content: ArrayBuffer;
}

