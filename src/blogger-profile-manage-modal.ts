import { Modal, Plugin, Setting } from 'obsidian';
import { IBloggerProfile, rendererProfile } from './blogger-profile';
import { getGlobalI18n } from './i18n/i18n';
import { openProfileModal } from './client/obsidian/blogger-profile-modal';
import { isNil } from 'lodash-es';
import { IPluginSettings, isPluginSettingsWithOAuth2 } from './plugin-settings';
import { getGoogleOAuth2Client } from './client/blogger/oauth2-client';
import { ITranslateKey } from './i18n/langs';
import { showError } from './utils/obsidian/obsidian-context';
import { addNewProfile, removeProfile, setDefaultProfile } from './plugin/settings';

/**
 * Blogger profiles manage modal.
 */
export class BloggerProfileManageModal extends Modal {
  protected readonly profiles: IBloggerProfile[];
  constructor(
    readonly plugin: Plugin,
    readonly settings: IPluginSettings,
    protected readonly saveSettings: () => Promise<void>,
  ) {
    super(plugin.app);
    this.profiles = settings.profiles;
  }

  onOpen() {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile, index) => {
        const setting = rendererProfile(profile, content);
        if (!profile.isDefault) {
          setting.addButton((button) =>
            button.setButtonText(t('profilesManageModal_setDefault')).onClick(async () => {

              setDefaultProfile({
                profiles: this.profiles,
              });

              profile.isDefault = true;
              renderProfiles();
              await this.saveSettings();
            }),
          );
        }
        setting.addButton((button) =>
          button.setButtonText(t('profilesManageModal_showDetails')).onClick(async () => {
            if (!isPluginSettingsWithOAuth2(this.settings)) {
              showError(t('error_noOAuth2ClientCredentials'));
              return;
            }
            const { profile: newProfile, atIndex } = await openProfileModal(
              this.plugin,
              profile,
              getGoogleOAuth2Client(this.settings),
              index,
            );
            if (!isNil(atIndex) && atIndex > -1) {
              this.profiles[atIndex] = newProfile;

              if (newProfile.isDefault)
              {
                setDefaultProfile({
                  profiles: this.profiles,
                }, atIndex);
              }

              renderProfiles();
              await this.saveSettings();
            }
          }),
        );
        setting.addExtraButton((button) =>
          button
            .setIcon('lucide-trash')
            .setTooltip(t('profilesManageModal_deleteTooltip'))
            .onClick(async () => {

              removeProfile({
                profiles: this.profiles,
              }, index);

              renderProfiles();
              await this.saveSettings();
            }),
        );
      });
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profilesManageModal_title') });

    new Setting(contentEl)
      .setName(t('profilesManageModal_create'))
      .setDesc(t('profilesManageModal_createDesc'))
      .addButton((button) =>
        button
          .setButtonText(t('profilesManageModal_create'))
          .setCta()
          .onClick(async () => {
            if (!isPluginSettingsWithOAuth2(this.settings)) {
              showError(t('error_noOAuth2ClientCredentials'));
              return;
            }
            const { profile } = await openProfileModal(
              this.plugin,
              {},
              getGoogleOAuth2Client(this.settings),
            );

            addNewProfile({
              profiles: this.profiles,
            }, profile);

            renderProfiles();
            await this.saveSettings();
          }),
      );

    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
