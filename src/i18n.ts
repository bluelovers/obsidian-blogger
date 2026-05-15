import { LANGUAGES } from './i18n/langs';
import { moment } from 'obsidian';
import { template } from 'lodash-es';

export type ILanguage = keyof typeof LANGUAGES;
export type ILanguageWithAuto = ILanguage | 'auto';
export type ITranslateKey = keyof (typeof LANGUAGES)['en'];

export class I18n {
  constructor(private readonly lang: ILanguageWithAuto = 'auto') {
    this.lang = lang;
  }

  t(key: ITranslateKey, vars?: Record<string, string>): string {
    const string = this.#get(key);
    if (vars) {
      const compiled = template(string);
      return compiled(vars);
    } else {
      return string;
    }
  }

  #get(key: ITranslateKey): string {
    let lang: ILanguage;
    if (this.lang === 'auto' && moment.locale().replace('-', '_') in LANGUAGES) {
      lang = moment.locale().replace('-', '_') as ILanguage;
    } else {
      lang = 'en';
    }
    return LANGUAGES[lang][key] || LANGUAGES['en'][key] || key;
  }
}

let i18n = new I18n();

export const setGlobalLang = (lang?: ILanguageWithAuto) => {
  i18n = new I18n(lang);
};

export const getGlobalI18n = () => {
  return i18n;
};
