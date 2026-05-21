
import { IPluginSettings } from '../../plugin-settings';
import { BloggerPublishModal, IOnSubmit, IOnSync } from '../../client/obsidian/modal/blogger-publish-modal';
import { IMatterData } from '../../types/types';
import { IBloggerClientResult, IBloggerPublishResult } from '../../types/blogger-client-interface';
import { IObsidianContext } from './obsidian-context';

/**
 * 顯示 Blogger 發布確認對話框
 * Show Blogger publish confirmation modal
 *
 * @param argv - 參數物件 / Arguments object
 * @param argv.ctx - Obsidian 上下文環境 / Obsidian context
 * @param argv.settings - 外掛設定 / Plugin settings
 * @param argv.hasPostId - 筆記是否已有 postId（已發布過）/ Whether the note already has a postId
 * @param argv.onSubmit - 提交時的回呼函式 / Callback function on submit
 * @param argv.onSync - 同步時的回呼函式（可選）/ Callback function on sync (optional)
 * @param argv.matterData - 筆記的 Frontmatter 資料 / Frontmatter data of the note
 * @returns 包含發布結果的 Promise / Promise containing publish result
 */
export function openPublishModal(argv: {
	ctx: IObsidianContext,
	settings: IPluginSettings,
	/**
	 * 筆記是否已有 postId（已發布過）
	 * Whether the note already has a postId (previously published)
	 */
	hasPostId: boolean,
	onSubmit: IOnSubmit,
	onSync?: IOnSync,
	matterData: IMatterData,
})
{
	return new Promise<IBloggerClientResult<IBloggerPublishResult>>((resolve, reject) => {
		const publishModal = new BloggerPublishModal(
			argv.ctx,
			argv.settings,
			argv.hasPostId,
			(
				postParams,
				updateMatterData,
				publishModal,
			) => {
				return argv.onSubmit(postParams, updateMatterData, publishModal, resolve, reject);
			},
			argv.matterData,
			argv.onSync,
		);
		publishModal.open();
	});
}
