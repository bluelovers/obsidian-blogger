import { IBloggerPostParamsCore } from './blogger-client-interface';

export type ISafeAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type IBrand<K, T> = K & { __brand: T };

export type IMatterData = { [p: string]: ISafeAny } & Partial<IBloggerPostParamsCore>;

export interface IMedia
{
  mimeType: string;
  fileName: string;
  content: ArrayBuffer;
}

