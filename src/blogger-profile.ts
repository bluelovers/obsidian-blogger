import { Setting } from 'obsidian';
import { IInternalOAuth2Token } from './oauth2-client';

export interface IBloggerProfile
{
  /**
   * Profile name.
   */
  name: string;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * Blogger blog ID.
   */
  blogId: string;

  /**
   * OAuth2 token for Google
   */
  googleOAuth2Token: IInternalOAuth2Token;

  /**
   * Is default profile.
   */
  isDefault: boolean;
}

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
