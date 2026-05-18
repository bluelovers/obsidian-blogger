import { IInternalOAuth2Token } from '../client/blogger/oauth2-client';

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
	blogId: `${number}`;

	/**
	 * OAuth2 token for Google
	 */
	googleOAuth2Token: IInternalOAuth2Token;

	/**
	 * Is default profile.
	 */
	isDefault: boolean;
}
