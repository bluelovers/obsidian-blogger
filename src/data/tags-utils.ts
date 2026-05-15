import { IMatterData } from '../types';
import { IBloggerPostParams, IBloggerPostParamsCore } from '../types/blogger-client-interface';
import { BLOGGER_DEFAULT_PROFILE_NAME } from '../consts';
import { EnumobsidianBloggerTags, EnumPostStatus } from '../types/const';

/**
 * 將 Front Matter 資料映射至 Blogger 發文參數
 * Map front matter data to Blogger post parameters
 *
 * @param matterData - 從 Obsidian Front Matter 解析的資料 / Parsed front matter data
 * @param postParams - 目標 Blogger 發文參數物件 / Target blogger post params object
 * @returns 已填入資料的 postParams / Populated post params
 */
export function _frontMatterToBloggerPostParams(matterData: IMatterData, postParams: IBloggerPostParams)
{
	/** 標題對映 / Map title */
	if (matterData.title)
	{
		postParams.title = matterData.title;
	}

	/** 文章 ID 對映（存在時表示更新已有文章）/ Map postId for existing post updates */
	if (matterData.postId)
	{
		postParams.postId = matterData.postId;
	}

	/**
	 * 標籤對映：優先使用 labels（與原版 obsidian-blogger 相容），其次 tags
	 * Map tags: labels takes precedence for backward compatibility
	 */
	postParams.tags = matterData.labels ?? matterData.tags ?? postParams.tags;

	/**
	 * 設定檔名稱：未指定時使用預設值
	 * Profile name defaults to BLOGGER_DEFAULT_PROFILE_NAME
	 */
	postParams.profileName = matterData.profileName ?? BLOGGER_DEFAULT_PROFILE_NAME;

	return postParams;
}

/**
 * 過濾前端標籤，移除僅供內部使用的標籤前綴
 * Filter out internal prefix tags before sending to Blogger API
 *
 * 內部標籤（如 obsidian-blogger/post、obsidian-blogger/draft）僅用於 Obsidian 內部狀態管理，
 * 不應被發送到 Blogger 伺服器。
 * Internal tags are for Obsidian internal state management only and must not be sent to Blogger API.
 *
 * @param tags - 原始標籤列表 / Raw tags array
 * @returns 過濾後的純標籤列表 / Filtered clean tags
 */
export function _handleTagsForBloggerPostApi(tags?: IBloggerPostParamsCore["tags"])
{
	/**
	 * 需要過濾的內部標籤清單
	 * Internal tags to be filtered out
	 */
	const filterTags: IBloggerPostParamsCore["tags"] = [
		EnumobsidianBloggerTags.Post,
		EnumobsidianBloggerTags.Draft,
		EnumobsidianBloggerTags.Published,
		EnumobsidianBloggerTags.Live,
	];
	return tags?.filter(tag => !filterTags.includes(tag)) ?? []
}

/**
 * 根據文章狀態更新 Front Matter 標籤
 * Update front matter tags based on post status
 *
 * 根據文章的當前狀態（草稿/已發布/已排程），自動新增對應的內部標籤，
 * 並移除與目前狀態衝突的標籤。
 * Automatically adds status-appropriate internal tags and removes conflicting ones.
 *
 * @param fm - Front Matter 資料物件 / Front matter data object
 * @param status - 文章狀態 / Post status
 * @returns 更新後的標籤陣列（已去重）/ Updated deduplicated tags array
 */
export function _updateFrontMatterTagsByPostStatus(fm: IMatterData, status: EnumPostStatus)
{
	/** 確保 tags 陣列存在 / Ensure tags array exists */
	fm.tags ??= [];

	/** 所有 Blogger 文章都應包含 Post 標籤 / All Blogger posts must include the Post tag */
	if (!fm.tags.includes(EnumobsidianBloggerTags.Post))
	{
		fm.tags.push(EnumobsidianBloggerTags.Post);
	}

	if (status === EnumPostStatus.Draft)
	{
		/**
		 * 草稿狀態：加入 Draft 標籤，移除 Live 標籤
		 * Draft status: add Draft tag, remove Live tag
		 */
		fm.tags.push(EnumobsidianBloggerTags.Draft);
		fm.tags = fm.tags.filter(tag => tag !== EnumobsidianBloggerTags.Live);
	}
	else if (status === EnumPostStatus.Live)
	{
		/**
		 * 已發布狀態：加入 Published 標籤，移除 Draft 與 Scheduled 標籤
		 * Live status: add Published tag, remove Draft and Scheduled tags
		 */
		fm.tags.push(EnumobsidianBloggerTags.Published);
		fm.tags = fm.tags.filter(tag => tag !== EnumobsidianBloggerTags.Draft && tag !== EnumobsidianBloggerTags.Scheduled);
	}
	else if (status === EnumPostStatus.Scheduled)
	{
		/**
		 * 已排程狀態：加入 Scheduled 標籤，移除 Live 標籤
		 * Scheduled status: add Scheduled tag, remove Live tag
		 */
		fm.tags.push(EnumobsidianBloggerTags.Scheduled);
		fm.tags = fm.tags.filter(tag => tag !== EnumobsidianBloggerTags.Live);
	}
	else if (status === EnumPostStatus.SoftTrashed)
	{
		/**
		 * 軟刪除狀態：加入 SoftTrashed 標籤，移除 Draft、Scheduled 與 Live 標籤
		 * Soft trashed status: add SoftTrashed tag, remove Draft, Scheduled and Live tags
		 */
		fm.tags.push(EnumobsidianBloggerTags.SoftTrashed);
		fm.tags = fm.tags.filter(tag => tag !== EnumobsidianBloggerTags.Draft && tag !== EnumobsidianBloggerTags.Scheduled && tag !== EnumobsidianBloggerTags.Live);
	}

	/**
	 * 當標籤數量超過一個時進行去重，避免重複添加
	 * Deduplicate when more than one tag exists
	 */
	if (fm.tags.length > 1)
	{
		fm.tags = [...new Set<string>(fm.tags)];
	}

	return fm.tags;
}

