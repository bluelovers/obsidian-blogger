import * as en from './en.json';
import * as zh_cn from './zh-cn.json';

export type ILanguage = Partial<typeof en>;

const _LANGUAGES = {
  en,
  zh_cn
};

export const LANGUAGES: Record<keyof typeof _LANGUAGES, ILanguage> = _LANGUAGES;
