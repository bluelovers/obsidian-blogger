import { App, Modal, Setting } from 'obsidian';
import { getGlobalI18n } from './i18n/i18n';
import { EnumConfirmCode } from './types/const';
import { ITranslateKey } from './i18n/langs';

export interface IConfirmModalMessages
{
  message: string;
  cancelText?: string;
  confirmText?: string;
}

export function openConfirmModal(
  messages: IConfirmModalMessages,
  app: App,
): Promise<{ code: EnumConfirmCode }> {
  return new Promise((resolve, reject) => {
    const modal = new ConfirmModal(messages, app, (code, modal) => {
      resolve({
        code,
      });
      modal.close();
    });
    modal.open();
  });
}

/**
 * Confirm modal.
 */
class ConfirmModal extends Modal {
  constructor(
    protected readonly messages: IConfirmModalMessages,
    app: App,
    protected readonly onAction: (code: EnumConfirmCode, modal: Modal) => void,
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: ITranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('confirmModal_title') });

    new Setting(contentEl).setName(this.messages.message);

    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText(this.messages.cancelText ?? t('confirmModal_cancel')).onClick(() => {
          this.onAction(EnumConfirmCode.Cancel, this);
        }),
      )
      .addButton((button) =>
        button
          .setButtonText(this.messages.confirmText ?? t('confirmModal_confirm'))
          .setCta()
          .onClick(() => {
            this.onAction(EnumConfirmCode.Confirm, this);
          }),
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
