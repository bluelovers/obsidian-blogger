import { Modal, Setting } from 'obsidian';
import { IBloggerProfile, rendererProfile } from './blogger-profile';
import { getGlobalI18n } from './i18n/i18n';
import { ITranslateKey } from './i18n/langs';
import type { IObsidianContext } from './utils/obsidian/obsidian-context';

export function openProfileChooserModal(
  ctx: IObsidianContext,
  profiles: IBloggerProfile[],
): Promise<IBloggerProfile> {
  return new Promise<IBloggerProfile>((resolve, reject) => {
    const modal = new BloggerProfileChooserModal(ctx, profiles, (profile) => {
      resolve(profile);
    });
    modal.open();
  });
}

/**
 * Blogger profiles chooser modal.
 */
class BloggerProfileChooserModal extends Modal {
  constructor(
    protected readonly ctx: IObsidianContext,
    protected readonly profiles: IBloggerProfile[],
    protected readonly onChoose: (profile: IBloggerProfile) => void,
  ) {
    super(ctx.app);
  }

  onOpen() {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const chooseProfile = (profile: IBloggerProfile): void => {
      this.onChoose(profile);
      this.close();
    };

    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile) => {
        const setting = rendererProfile(profile, content);
        setting.settingEl.addEventListener('click', () => {
          chooseProfile(profile);
        });
      });
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profilesChooserModal_title') });

    new Setting(contentEl).setName(t('profilesChooserModal_pickOne'));
    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
