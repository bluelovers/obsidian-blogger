import { ILanguageWithAuto } from './i18n';
import { IBloggerProfile } from './blogger-profile';
import { ISafeAny } from './types';

import { EnumMathJaxOutputType, EnumPostStatus, EnumSettingsVersion } from './types/const';

export type IOauth2ClientCredentials = {
  clientId: string;
  clientSecret: string;
};

export type IPluginSettings = {
  version: EnumSettingsVersion;

  /**
   * Plugin language.
   */
  lang: ILanguageWithAuto;

  profiles: IBloggerProfile[];

  /**
   * Show plugin icon in side.
   */
  showRibbonIcon: boolean;

  /**
   * Default post status.
   */
  defaultPostStatus: EnumPostStatus;

  /**
   * If the page is opened with browser when published successfully.
   */
  openPublishedPageWithBrowser: boolean;

  mathJaxOutputType: EnumMathJaxOutputType;

  enableHtml: boolean;
} & Partial<IOauth2ClientCredentials>;

export type IPluginSettingsWithOAuth2 = IPluginSettings & IOauth2ClientCredentials;

export const isPluginSettingsWithOAuth2 = (
  settings: IPluginSettings,
): settings is IPluginSettingsWithOAuth2 => {
  return !!(settings.clientId && settings.clientSecret);
};

export const DEFAULT_SETTINGS: IPluginSettings = {
  version: EnumSettingsVersion.V1,
  lang: 'auto',
  profiles: [],
  showRibbonIcon: false,
  defaultPostStatus: EnumPostStatus.Draft,
  openPublishedPageWithBrowser: false,
  mathJaxOutputType: EnumMathJaxOutputType.SVG,
  enableHtml: false,
};

// Currently we only have one version
export async function upgradeSettings(
  existingSettings: ISafeAny,
  to: EnumSettingsVersion,
): Promise<{ needUpgrade: boolean; settings: IPluginSettings }> {
  return {
    needUpgrade: false,
    settings: existingSettings,
  };
}
