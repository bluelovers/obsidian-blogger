import {
  IBloggerClient,
  IBloggerClientResult,
  IBloggerMediaUploadResult,
  IBloggerPostParams,
  IBloggerPublishResult,
} from './types/blogger-client-interface';
import { IBloggerPostApiReturn, RestClient } from './client/blogger/rest-client';
import { isFunction, isString, template } from 'lodash-es';
import { IBloggerProfile } from './blogger-profile';
import { IMatterData, ISafeAny } from './types';
import { BLOGGER_API_ENDPOINT } from './consts';
import { getGoogleOAuth2Client } from './client/blogger/oauth2-client';
import { App, Notice } from 'obsidian';
import { BloggerPublishModal } from './blogger-publish-modal';
import { openWithBrowser, processFile } from './utils';
import { openConfirmModal } from './confirm-modal';
import { getGlobalI18n } from './i18n/i18n';
import { getGlobalMarkdownParser } from './markdown-it-default';
import { IPluginSettings, isPluginSettingsWithOAuth2 } from './plugin-settings';
import { _hasError, IFormItemNameMapper } from './utils/type-utils';
import { EnumBloggerClientReturnCode, EnumConfirmCode, EnumobsidianBloggerTags, EnumPostStatus } from './types/const';
import {
  _handleTagsForBloggerPostApi,
  _frontMatterToBloggerPostParams,
  _updateFrontMatterTagsByPostStatus,
} from './data/tags-utils';
import { showError } from './utils/obsidian/showError';

export abstract class AbstractBloggerClient implements IBloggerClient {
  /**
   * Client name.
   */
  name = 'AbstractBloggerClient';

  protected constructor(
    protected readonly app: App,
    protected readonly settings: IPluginSettings,
    protected readonly profile: IBloggerProfile,
  ) {}

  abstract publish(
    title: string,
    content: string,
    postParams: IBloggerPostParams,
  ): Promise<IBloggerClientResult<IBloggerPublishResult>>;

  private async checkExistingProfile(matterData: IMatterData) {
    const { profileName } = matterData;
    const isProfileNameMismatch = profileName && profileName !== this.profile.name;
    if (isProfileNameMismatch) {
      const confirm = await openConfirmModal(
        {
          message: getGlobalI18n().t('error_profileNotMatch'),
          cancelText: getGlobalI18n().t('profileNotMatch_useOld', {
            profileName: matterData.profileName!,
          }),
          confirmText: getGlobalI18n().t('profileNotMatch_useNew', {
            profileName: this.profile.name,
          }),
        },
        this.app,
      );
      if (confirm.code !== EnumConfirmCode.Cancel) {
        delete matterData.postId;
      }
    }
  }

  private async tryToPublish(params: {
    postParams: IBloggerPostParams;
    updateMatterData?: (matter: IMatterData) => void;
  }): Promise<IBloggerClientResult<IBloggerPublishResult>> {
    const { postParams, updateMatterData } = params;
    const result = await this.publish(
      postParams.title ?? 'A post from Obsidian!',
      // FIXME: this modification should be done on the renderer side
      `<div class="obsidian-blogger-post">
      ${getGlobalMarkdownParser().render(postParams.content)}
      </div>`,
      postParams,
    );
    if (result.code === EnumBloggerClientReturnCode.Error) {
      throw new Error(
        getGlobalI18n().t('error_publishFailed', {
          message: result.message,
        }),
      );
    } else {
      new Notice(getGlobalI18n().t('message_publishSuccessfully'));
      // post id will be returned if creating, true if editing
      const postId = result.data.postId;
      if (postId) {
        // const modified = matter.stringify(postParams.content, matterData, matterOptions);
        // this.updateFrontMatter(modified);
        const file = this.app.workspace.getActiveFile();
        if (file) {
          await this.app.fileManager.processFrontMatter(file, (fm: IMatterData) => {
            fm.profileName = this.profile.name;
            fm.postId = postId;

            fm.tags = _updateFrontMatterTagsByPostStatus(fm, result.data.status);

            if (isFunction(updateMatterData)) {
              updateMatterData(fm);
            }
          });
        }

        if (this.settings.openPublishedPageWithBrowser) {
          openWithBrowser(result.data.url);
        }
      }
    }
    return result;
  }

  async publishPost(
    defaultPostParams?: IBloggerPostParams,
  ): Promise<IBloggerClientResult<IBloggerPublishResult>> {
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(getGlobalI18n().t('error_noEndpoint'));
      }
      // const { activeEditor } = this.plugin.app.workspace;
      const file = this.app.workspace.getActiveFile();
      if (file === null) {
        throw new Error(getGlobalI18n().t('error_noActiveFile'));
      }

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.app);

      // check if profile selected is matched to the one in note property,
      // if not, ask whether to update or not
      await this.checkExistingProfile(matterData);

      // now we're preparing the publishing data
      let postParams: IBloggerPostParams;
      let result: IBloggerClientResult<IBloggerPublishResult> | undefined;
      if (defaultPostParams) {
        postParams = this.readFromFrontMatter(title, matterData, defaultPostParams);
        postParams.content = content;
        result = await this.tryToPublish({
          postParams,
        });
      } else {
        result = await new Promise((resolve) => {
          const publishModal = new BloggerPublishModal(
            this.app,
            this.settings,
            async (
              postParams: IBloggerPostParams,
              updateMatterData: (matter: IMatterData) => void,
            ) => {
              postParams = this.readFromFrontMatter(title, matterData, postParams);
              postParams.content = content;
              try {
                const r = await this.tryToPublish({
                  postParams,
                  updateMatterData,
                });
                if (r.code === EnumBloggerClientReturnCode.OK) {
                  publishModal.close();
                  resolve(r);
                }
              } catch (error) {
                if (error instanceof Error) {
                  return showError(error);
                } else {
                  throw error;
                }
              }
            },
          );
          publishModal.open();
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(getGlobalI18n().t('message_publishFailed'));
      }
    } catch (error) {
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
  }

  private readFromFrontMatter(
    noteTitle: string,
    matterData: IMatterData,
    params: IBloggerPostParams,
  ): IBloggerPostParams {
    const postParams = { ...params };
    postParams.title = noteTitle;
    return _frontMatterToBloggerPostParams(matterData, postParams);
  }
}

interface IBloggerRestEndpoint
{
  base: string | IUrlGetter;
  newPost: string | IUrlGetter;
  editPost: string | IUrlGetter;
}

export class BloggerRestClient extends AbstractBloggerClient {
  private readonly client: RestClient;

  constructor(
    readonly app: App,
    readonly settings: IPluginSettings,
    // FIXME: Since only what we need is to refresh the token, there should be a
    // better way than passing `saveSettings` here.
    private readonly saveSettings: () => Promise<void>,
    readonly profile: IBloggerProfile,
    private readonly context: IBloggerRestClientContext,
  ) {
    super(app, settings, profile);
    this.name = 'BloggerRestClient';
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint)),
    });
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = this.profile.googleOAuth2Token;
    if (!token) {
      throw new Error(getGlobalI18n().t('error_invalidGoogleToken'));
    }
    if (!isPluginSettingsWithOAuth2(this.settings)) {
      throw new Error(getGlobalI18n().t('error_noOAuth2ClientCredentials'));
    }
    const fresh_token = await getGoogleOAuth2Client(this.settings)
      .ensureFreshToken(token)
      .catch(() => {
        throw new Error(getGlobalI18n().t('error_invalidGoogleToken'));
      });
    if (token !== fresh_token) {
      this.profile.googleOAuth2Token = fresh_token;
      await this.saveSettings();
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${fresh_token.accessToken}`,
    };
    return headers;
  }

  async publish(
    title: string,
    content: string,
    postParams: IBloggerPostParams,
  ): Promise<IBloggerClientResult<IBloggerPublishResult>> {
    let url: string;
    let method: typeof this.client.httpPut;
    if (postParams.postId) {
      url = getUrl(this.context.endpoints?.editPost, 'dummy/update/<%= postId %>', {
        postId: postParams.postId,
      });
      method = this.client.httpPut.bind(this.client);
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'dummy/post?isDraft=<%= isDraft %>', {
        isDraft: postParams.status === EnumPostStatus.Draft,
      });
      method = this.client.httpPost.bind(this.client);
    }
    const resp = await method(
      url,
      {
        kind: 'blogger#post',
        blog: {
          id: this.profile.blogId,
        },
        title,
        content,
        labels: _handleTagsForBloggerPostApi(postParams.tags),
        status: postParams.status,
      },
      {
        headers: await this.getHeaders(),
      },
    );
    if (_hasError(resp)) {
      const error = resp.error
      let message = getGlobalI18n().t('error_requestFailed', {
        code: error.code,
        message: error.message,
      });
      // Detect typical error cases
      if (method === this.client.httpPut.bind(this.client) && error.code === 404) {
        message = `${message} ${getGlobalI18n().t('error_postNotFound')}`;
      }
      return {
        code: EnumBloggerClientReturnCode.Error,
        message,
        response: resp,
      };
    }
    try {
      const result = this.context.responseParser.toBloggerPublishResult(postParams, resp);
      return {
        code: EnumBloggerClientReturnCode.OK,
        data: result,
        response: resp,
      };
    } catch (e) {
      return {
        code: EnumBloggerClientReturnCode.Error,
        message: getGlobalI18n().t('error_cannotParseResponse'),
        response: resp,
      };
    }
  }
}

type IUrlGetter = () => string;

function getUrl(
  url: string | IUrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string | number | boolean },
): string {
  let resultUrl: string;
  if (isString(url)) {
    resultUrl = url;
  } else if (isFunction(url)) {
    resultUrl = url();
  } else {
    resultUrl = defaultValue;
  }
  if (params) {
    const compiled = template(resultUrl);
    return compiled(params);
  } else {
    return resultUrl;
  }
}

interface IBloggerRestClientContext
{
  name: string;

  responseParser: {
    toBloggerPublishResult: (
      postParams: IBloggerPostParams,
      response: ISafeAny,
    ) => IBloggerPublishResult;
    /**
     * Convert response to `IBloggerMediaUploadResult`.
     *
     * If there is any error, throw new error directly.
     * @param response response from remote server
     */
    toBloggerMediaUploadResult: (response: ISafeAny) => IBloggerMediaUploadResult;
  };

  endpoints?: Partial<IBloggerRestEndpoint>;

  needLoginModal?: boolean;

  formItemNameMapper?: IFormItemNameMapper;
}

export class BloggerRestClientGoogleOAuth2Context implements IBloggerRestClientContext {
  name = 'BloggerRestClientGoogleOAuth2Context';

  needLoginModal = false;

  endpoints: IBloggerRestEndpoint = {
    base: BLOGGER_API_ENDPOINT,
    newPost: () => `/${this.blogId}/posts?isDraft=<%= isDraft %>`,
    editPost: () => `/${this.blogId}/posts/<%= postId %>`,
  };

  constructor(private readonly blogId: string) {}

  formItemNameMapper(name: string, isArray: boolean): string {
    if (name === 'file' && !isArray) {
      return 'media[]';
    }
    return name;
  }

  responseParser = {
    toBloggerPublishResult: (
      postParams: IBloggerPostParams,
      response: IBloggerPostApiReturn,
    ): IBloggerPublishResult => {
      if (response.id) {
        if (postParams.postId !== undefined && postParams.postId !== response.id) {
          throw new Error(
            `Inconsistent post IDs. This should be a bug: ${postParams.postId} vs ${response.id}`,
          );
        }
        return {
          postId: response.id,
          url: response.url,
          status: response.status,
        };
      }
      throw new Error('xx');
    },
    toBloggerMediaUploadResult: (response: ISafeAny): IBloggerMediaUploadResult => {
      if (response.media.length > 0) {
        const media = response.media[0];
        return {
          url: media.link,
        };
      } else if (response.errors) {
        throw new Error(response.errors.error.message);
      }
      throw new Error('Upload failed');
    },
  };
}

export function getBloggerClient(
  app: App,
  settings: IPluginSettings,
  saveSettings: () => Promise<void>,
  profile: IBloggerProfile,
): IBloggerClient | null {
  if (!profile.endpoint || profile.endpoint.length === 0) {
    showError(getGlobalI18n().t('error_noEndpoint'));
    return null;
  }
  if (!profile.googleOAuth2Token) {
    showError(getGlobalI18n().t('error_invalidGoogleToken'));
    return null;
  }
  if (!profile.blogId) {
    showError(getGlobalI18n().t('error_noBlogId'));
    return null;
  }
  return new BloggerRestClient(
    app,
    settings,
    saveSettings,
    profile,
    new BloggerRestClientGoogleOAuth2Context(profile.blogId),
  );
}
