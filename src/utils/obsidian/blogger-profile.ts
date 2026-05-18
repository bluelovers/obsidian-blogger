import { Setting } from 'obsidian';
import { IBloggerProfile } from '../../types/blogger-profile';

export function rendererProfile(profile: IBloggerProfile, container: HTMLElement): Setting {
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }
  let desc = profile.endpoint;
  if (profile.googleOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  }
  return new Setting(container).setName(name).setDesc(desc);
}
