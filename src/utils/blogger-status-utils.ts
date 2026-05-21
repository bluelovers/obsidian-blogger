import { getGlobalI18n } from '../i18n/i18n';
import { ITranslateKey } from '../i18n/langs';
import { EnumPostStatus } from '../types/const';
import { _getPostStatusFromTags } from './tags-utils';

/**
 * 文章狀態資訊
 * Article status info
 */
export interface IArticleStatusInfo
{
	/** 文章狀態列舉值 / Post status enum value */
	status: EnumPostStatus | undefined;
	/** 狀態顯示文字 / Status display label */
	statusLabel: string;
	/** 狀態 CSS 類別 / Status CSS class */
	statusClass: string;
}

/**
 * 狀態徽章樣式映射表
 * Status badge style map
 *
 * 將文章狀態對映至背景色與文字色，供各 View 統一使用。
 * Maps post status to background/text colors for consistent use across views.
 */
export const STATUS_BADGE_STYLE_MAP: Record<EnumPostStatus, { bg: string; color: string }> = {
	[EnumPostStatus.Live]:       { bg: 'var(--color-green)',  color: '#fff' },
	[EnumPostStatus.Draft]:      { bg: 'var(--color-yellow)', color: '#000' },
	[EnumPostStatus.SoftTrashed]: { bg: 'var(--color-red)',    color: '#fff' },
	[EnumPostStatus.Scheduled]:  { bg: 'var(--color-blue)',   color: '#fff' },
};

/**
 * 預設文章狀態樣式（無狀態或未知狀態時使用）
 * Default status style (used when status is undefined or unknown)
 */
export const DEFAULT_STATUS_BADGE_STYLE = { bg: 'var(--text-muted)', color: 'var(--text-on-accent)' } as const;

/**
 * 取得文章狀態的 CSS 類別
 * Get CSS class for post status
 *
 * @param status - 文章狀態 / Post status
 * @returns CSS 類別名稱 / CSS class name
 */
function _getStatusClass(status: EnumPostStatus | undefined): string
{
	switch (status)
	{
		case EnumPostStatus.Live:
			return 'blogger-status-live';
		case EnumPostStatus.Draft:
			return 'blogger-status-draft';
		case EnumPostStatus.Scheduled:
			return 'blogger-status-scheduled';
		case EnumPostStatus.SoftTrashed:
			return 'blogger-status-trashed';
		default:
			return 'blogger-status-unknown';
	}
}

/**
 * 取得文章狀態的 i18n 標籤鍵值
 * Get i18n label key for post status
 *
 * @param status - 文章狀態 / Post status
 * @returns 翻譯鍵值 / Translation key
 */
function _getStatusLabelKey(status: EnumPostStatus | undefined): ITranslateKey
{
	switch (status)
	{
		case EnumPostStatus.Live:
			return 'bloggerDashboard_statusLive' as ITranslateKey;
		case EnumPostStatus.Draft:
			return 'bloggerDashboard_statusDraft' as ITranslateKey;
		case EnumPostStatus.Scheduled:
			return 'bloggerDashboard_statusScheduled' as ITranslateKey;
		case EnumPostStatus.SoftTrashed:
			return 'bloggerDashboard_statusTrashed' as ITranslateKey;
		default:
			return 'bloggerDashboard_statusUnpublished' as ITranslateKey;
	}
}

/**
 * 取得文章狀態與對應的文字與 CSS 類別
 * Get post status with corresponding text and CSS class
 *
 * @param tags - 文章的標籤陣列 / Tags array of the article
 * @returns 文章狀態資訊 / Article status info
 */
export function getArticleStatusInfo(tags?: string[]): IArticleStatusInfo
{
	const status = _getPostStatusFromTags(tags);
	if (!status)
	{
		return {
			status: undefined,
			statusLabel: getGlobalI18n().t('bloggerDashboard_statusUnpublished'),
			statusClass: 'blogger-status-unpublished',
		};
	}
	return {
		status,
		statusLabel: getGlobalI18n().t(_getStatusLabelKey(status)),
		statusClass: _getStatusClass(status),
	};
}

/**
 * 為狀態徽章元素套用色彩樣式
 * Apply color styles to a status badge element
 *
 * @param el - 目標 HTMLElement / Target HTMLElement
 * @param status - 文章狀態 / Post status
 */
export function applyStatusBadgeStyle(el: HTMLElement, status: EnumPostStatus | undefined): void
{
	const style = status
		? STATUS_BADGE_STYLE_MAP[status] ?? DEFAULT_STATUS_BADGE_STYLE
		: DEFAULT_STATUS_BADGE_STYLE;
	el.style.backgroundColor = style.bg;
	el.style.color = style.color;
}
