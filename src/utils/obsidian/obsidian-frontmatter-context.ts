import { TFile } from 'obsidian';
import { IMatterData } from '../../types/types';
import { IObsidianContext } from './obsidian-context';
import { IBloggerPostParams } from '../../types/blogger-client-interface';
import { _frontMatterToBloggerPostParams, _updateFrontMatterTagsByPostStatus, _getPostStatusFromTags } from '../tags-utils';
import { EnumPostStatus } from '../../types/const';

/**
 * 建立 Frontmatter 管理上下文
 * Create Frontmatter context
 *
 * 封裝對單一檔案的 YAML Frontmatter 讀寫操作，
 * 集中管理與 Obsidian 的 API 互動（如 metadataCache 與 processFrontMatter）。
 *
 * @param file - 目標檔案 / Target file
 * @param ctx - Obsidian 上下文 / Obsidian context
 * @returns Frontmatter 管理物件 / Frontmatter management object
 */
export function createFrontmatterContext(file: TFile, ctx: IObsidianContext)
{
	return {
		/**
		 * 讀取目前的 Frontmatter 快取資料
		 * Read current Frontmatter cache data
		 *
		 * @returns Frontmatter 資料 / Frontmatter data
		 */
		read(): IMatterData | undefined
		{
			return ctx.app.metadataCache.getFileCache(file)?.frontmatter as IMatterData | undefined;
		},

		/**
		 * 確保取得 Frontmatter，若無則初始化
		 * Ensure Frontmatter is retrieved, initialize if none
		 *
		 * @returns 必定有值的 Frontmatter / Guaranteed Frontmatter data
		 */
		async readEnsure(): Promise<IMatterData>
		{
			let fm = this.read();
			if (!fm)
			{
				await ctx.app.fileManager.processFrontMatter(file, (matter: IMatterData) =>
				{
					fm = matter;
				});
			}
			return fm ?? {};
		},

		/**
		 * 更新該檔案的 Frontmatter
		 * Update Frontmatter for the file
		 *
		 * @param matterDataOrCallback - 要更新的 Frontmatter 屬性，或用來修改的 callback 函式 / Frontmatter properties to update, or callback function
		 */
		async update(matterDataOrCallback: Partial<IMatterData> | ((matter: IMatterData) => void)): Promise<void>
		{
			await ctx.app.fileManager.processFrontMatter(file, (matter: IMatterData) =>
			{
				if (typeof matterDataOrCallback === 'function')
				{
					matterDataOrCallback(matter);
				}
				else
				{
					Object.assign(matter, matterDataOrCallback);
				}
			});
		},

		/**
		 * Blogger 專屬的 Frontmatter 操作
		 * Blogger-specific Frontmatter operations
		 */
		blogger: {
			/**
			 * 轉換為 Blogger 發文參數
			 * Convert to Blogger post params
			 */
			toPostParams(postParams: Partial<IBloggerPostParams>): IBloggerPostParams
			{
				// 使用強制讀取或至少給空物件
				const matterData = ctx.app.metadataCache.getFileCache(file)?.frontmatter as IMatterData | undefined ?? {};
				return _frontMatterToBloggerPostParams(matterData, postParams);
			},

			/**
			 * 取得文章狀態
			 * Get post status
			 */
			getPostStatus(defaultPostStatus?: EnumPostStatus): EnumPostStatus | undefined
			{
				const matterData = ctx.app.metadataCache.getFileCache(file)?.frontmatter as IMatterData | undefined;
				return _getPostStatusFromTags(matterData?.tags, defaultPostStatus);
			},

			/**
			 * 寫入發布成功的結果（包含狀態標籤更新）
			 * Update publish success result (including status tags update)
			 *
			 * 會一併將 Blogger API 回傳的 published / updated 日期與 thumbnail 寫入 Frontmatter。
			 * Also writes published / updated dates and thumbnail from Blogger API response.
			 */
			async updatePublishSuccess(params: {
				profileName: string;
				postId: `${number}`;
				url: string;
				status: EnumPostStatus;
				published?: string;
				updated?: string;
				thumbnail?: string;
				customTitle?: string;
				extraUpdate?: (matter: IMatterData) => void;
			}): Promise<void>
			{
				await ctx.app.fileManager.processFrontMatter(file, (fm: IMatterData) =>
				{
					fm.profileName = params.profileName;
					fm.postId = params.postId;
					fm.url = params.url;
					fm.tags = _updateFrontMatterTagsByPostStatus(fm, params.status);

					if (params.customTitle && params.customTitle !== file.basename)
					{
						fm.title = params.customTitle;
					}

					/** 寫入 Blogger API 回傳的後設資料巢狀欄位 */
					if (params.published || params.updated || params.thumbnail)
					{
						fm.blogger = {
							...(fm.blogger ?? {}),
							...(params.published ? { published: params.published } : {}),
							...(params.updated ? { updated: params.updated } : {}),
							...(params.thumbnail ? { thumbnail: params.thumbnail } : {}),
						};
					}

					params.extraUpdate?.(fm);
				});
			},

			/**
			 * 僅更新文章狀態標籤
			 * Update post status tags only
			 */
			async updateStatusTags(status: EnumPostStatus): Promise<void>
			{
				await ctx.app.fileManager.processFrontMatter(file, (fm: IMatterData) =>
				{
					fm.tags = _updateFrontMatterTagsByPostStatus(fm, status);
				});
			}
		}
	} as const;
}

/**
 * Frontmatter 上下文型別
 * Frontmatter context type
 */
export type IFrontmatterContext = ReturnType<typeof createFrontmatterContext>;
