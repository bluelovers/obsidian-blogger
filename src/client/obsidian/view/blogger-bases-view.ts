import { BasesView, QueryController, BasesPropertyId, BasesEntry } from 'obsidian';
import { _getPostStatusFromTags } from '../../../utils/tags-utils';
import { EnumPostStatus } from '../../../types/const';
import { getGlobalI18n } from '../../../i18n/i18n';
import { ITranslateKey } from '../../../i18n/langs';

/**
 * Blogger Bases View Type
 * Blogger Bases 檢視類型
 */
export const BLOGGER_BASES_VIEW_TYPE = 'blogger-bases-view';

/**
 * 取得 i18n 翻譯
 * Get i18n translation
 *
 * @param key - 翻譯鍵值 / Translation key
 * @returns 翻譯後的字串 / Translated string
 */
function _t(key: ITranslateKey, vars?: Record<string, string>): string
{
	return getGlobalI18n().t(key, vars);
}

/**
 * 安全地從 BasesEntry 取得屬性字串值
 * Safely get a property string value from BasesEntry
 *
 * getValue() 可能回傳 NullValue 實例，其 toString() 會回傳字串 "null"，
 * 而非 JS 的 null。此 helper 確保正確區分真實 null/undefined 與 NullValue。
 * getValue() may return a NullValue instance whose toString() returns the
 * string "null" instead of JS null. This helper correctly distinguishes
 * real null/undefined from NullValue.
 *
 * @param entry - Bases 條目 / Bases entry
 * @param propertyId - 屬性 ID / Property ID
 * @returns 屬性字串值，若無效則回傳 null / Property string value, or null if invalid
 */
function _getStringValue(entry: BasesEntry, propertyId: BasesPropertyId): string | null
{
	const value = entry.getValue(propertyId);

	if (!value)
	{
		return null;
	}

	const str = value.toString();

	/** NullValue.toString() 回傳 "null"，視為無效值 */
	if (str === 'null' || str === 'undefined')
	{
		return null;
	}

	return str;
}

/**
 * 格式化日期字串
 * Format date string
 *
 * @param isoString - ISO 8601 日期字串 / ISO 8601 date string
 * @returns 格式化後的日期文字 / Formatted date text
 */
function _formatDate(isoString?: string | null): string
{
	if (!isoString) return '—';

	try
	{
		const d = new Date(isoString);
		if (isNaN(d.getTime())) return isoString;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${y}-${m}-${day} ${h}:${min}`;
	}
	catch
	{
		return isoString;
	}
}

/**
 * 取得文章狀態與對應的文字與 CSS 類別
 * Get post status with corresponding text and CSS class
 */
function _getArticleStatusInfo(tags: string[]): {
	status: EnumPostStatus | undefined;
	statusLabel: string;
	statusClass: string;
}
{
	const status = _getPostStatusFromTags(tags);
	if (!status)
	{
		return {
			status: undefined,
			statusLabel: _t('bloggerDashboard_statusUnpublished'),
			statusClass: 'blogger-status-unpublished',
		};
	}
	switch (status)
	{
		case EnumPostStatus.Live:
			return {
				status,
				statusLabel: _t('bloggerDashboard_statusLive'),
				statusClass: 'blogger-status-live',
			};
		case EnumPostStatus.Draft:
			return {
				status,
				statusLabel: _t('bloggerDashboard_statusDraft'),
				statusClass: 'blogger-status-draft',
			};
		case EnumPostStatus.Scheduled:
			return {
				status,
				statusLabel: _t('bloggerDashboard_statusScheduled'),
				statusClass: 'blogger-status-scheduled',
			};
		case EnumPostStatus.SoftTrashed:
			return {
				status,
				statusLabel: _t('bloggerDashboard_statusTrashed'),
				statusClass: 'blogger-status-trashed',
			};
		default:
			return {
				status,
				statusLabel: 'Unknown',
				statusClass: 'blogger-status-unknown',
			};
	}
}

/**
 * 從 tags 字串解析出標籤陣列
 * Parse tags array from tags string
 *
 * Bases 查詢中的 tags 屬性可能以 JSON 陣列字串或多種格式呈現，
 * 此函數嘗試智慧解析並過濾出 Blogger 內部標籤。
 * The tags property in Bases queries may be a JSON array string or
 * other formats; this function intelligently parses and filters
 * for Blogger internal tags.
 *
 * @param tagsStr - tags 屬性值字串 / Tags property value string
 * @returns 標籤陣列 / Tags array
 */
function _parseTags(tagsStr: string | null): string[]
{
	if (!tagsStr) return [];

	try
	{
		/** 嘗試解析 JSON 陣列：["tag1","tag2"] */
		const parsed = JSON.parse(tagsStr);
		if (Array.isArray(parsed))
		{
			return parsed.map(String);
		}
	}
	catch
	{
		/** 非 JSON 格式，繼續嘗試其他解析方式 */
	}

	/**
	 * 嘗試以逗號分隔（如 "obsidian-blogger/post, obsidian-blogger/live"）
	 * Try comma-separated parsing
	 */
	const commaSplit = tagsStr.split(',').map(s => s.trim()).filter(Boolean);
	if (commaSplit.length > 0)
	{
		return commaSplit;
	}

	return [];
}

/**
 * 取得 tag 屬性的 Blogger 內部標籤（obsidian-blogger/*）
 * Extract Blogger internal tags from the tags property
 *
 * @param entry - Bases 條目 / Bases entry
 * @returns Blogger 內部標籤陣列 / Blogger internal tags array
 */
function _getBloggerTags(entry: BasesEntry): string[]
{
	/**
	 * 嘗試多個可能的 tags 屬性名稱，以相容不同的 frontmatter 格式
	 * Try multiple possible tag property names for frontmatter format compatibility
	 */
	const possibleProps: BasesPropertyId[] = [
		'note.tags' as BasesPropertyId,
		'note.labels' as BasesPropertyId,
	];

	for (const prop of possibleProps)
	{
		const tagsStr = _getStringValue(entry, prop);
		if (tagsStr)
		{
			const tags = _parseTags(tagsStr);
			if (tags.length > 0)
			{
				return tags;
			}
		}
	}

	return [];
}

/**
 * Blogger Bases 檢視類別
 * Blogger Bases View class
 *
 * 在 Obsidian Bases 系統中顯示筆記資料的卡片式檢視。
 * 使用者可在 .base 檔案中透過屬性查詢選擇此檢視類型，
 * 檢視會根據查詢結果渲染每筆資料為可點擊的卡片。
 * Displays note data as a card-style view within the Obsidian Bases system.
 * Users can select this view type in .base files via property queries,
 * and the view renders each entry as a clickable card.
 */
export class BloggerBasesView extends BasesView
{
	readonly type = BLOGGER_BASES_VIEW_TYPE;

	private containerEl: HTMLElement;

	/**
	 * 建立 Blogger Bases 檢視實例
	 * Create Blogger Bases View instance
	 *
	 * @param controller - QueryController 實例 / QueryController instance
	 * @param parentEl - 父容器元素 / Parent container element
	 */
	constructor(controller: QueryController, parentEl: HTMLElement)
	{
		super(controller);

		/** 建立檢視容器 */
		this.containerEl = parentEl.createDiv('blogger-bases-view-container');
	}

	/**
	 * 資料更新時的回呼
	 * Callback when data is updated
	 *
	 * 每當 vault 資料或 Bases 配置變更時，Obsidian 會呼叫此方法。
	 * 檢視應在此重新渲染內容。
	 * Called by Obsidian whenever vault data or Bases configuration changes.
	 * The view should re-render its content here.
	 */
	onDataUpdated(): void
	{
		this.render();
	}

	/**
	 * 渲染檢視內容
	 * Render view content
	 */
	private render(): void
	{
		this.containerEl.empty();

		/** 尚未有資料時不渲染 */
		if (!this.data)
		{
			return;
		}

		const entries = this.data.data;

		/** 無資料時顯示空狀態 */
		if (!entries || entries.length === 0)
		{
			this.containerEl.createDiv({
				cls: 'blogger-bases-empty',
				text: 'No entries',
			});
			return;
		}

		/** 渲染每筆資料為卡片 */
		for (const entry of entries)
		{
			const cardEl = this.containerEl.createDiv('blogger-bases-card');

			/**
			 * 標題：優先使用「title」屬性值，否則使用檔名
			 * Title: prefer the "title" property value, otherwise fall back to filename
			 */
			const titleValue = _getStringValue(entry, 'note.title' as BasesPropertyId);
			cardEl.createDiv({
				cls: 'blogger-bases-title',
				text: titleValue ?? entry.file.basename,
			});

			/** ===== 元資料區域（狀態標籤 + 日期） ===== */
			const metaEl = cardEl.createDiv({
				cls: 'blogger-bases-meta',
			});

			/** 從 tags 屬性解析發布狀態 */
			const bloggerTags = _getBloggerTags(entry);
			const { status, statusLabel, statusClass } = _getArticleStatusInfo(bloggerTags);

			/** 狀態標籤（彩色徽章） */
			const statusEl = metaEl.createSpan({
				cls: `blogger-status-badge ${statusClass}`,
				text: statusLabel,
			});

			/** 狀態色彩 */
			switch (status)
			{
				case EnumPostStatus.Live:
					statusEl.style.backgroundColor = 'var(--color-green)';
					statusEl.style.color = '#fff';
					break;
				case EnumPostStatus.Draft:
					statusEl.style.backgroundColor = 'var(--color-yellow)';
					statusEl.style.color = '#000';
					break;
				case EnumPostStatus.SoftTrashed:
					statusEl.style.backgroundColor = 'var(--color-red)';
					statusEl.style.color = '#fff';
					break;
				case EnumPostStatus.Scheduled:
					statusEl.style.backgroundColor = 'var(--color-blue)';
					statusEl.style.color = '#fff';
					break;
				default:
					statusEl.style.backgroundColor = 'var(--text-muted)';
					statusEl.style.color = 'var(--text-on-accent)';
					break;
			}

			/** 日期資訊（發布日或更新日） */
			const published = _getStringValue(entry, 'note.blogger.published' as BasesPropertyId);
			const updated = _getStringValue(entry, 'note.blogger.updated' as BasesPropertyId);

			if (published || updated)
			{
				const dateEl = metaEl.createSpan({
					cls: 'blogger-bases-date',
				});
				const dateText = updated
					? _t('bloggerDashboard_updatedAt', { date: _formatDate(updated) })
					: _t('bloggerDashboard_publishedAt', { date: _formatDate(published) });
				dateEl.textContent = dateText;
			}

			/**
			 * 點擊卡片時在分頁中開啟對應檔案
			 * Clicking the card opens the corresponding file in a new tab
			 */
			cardEl.onClickEvent(() =>
			{
				this.app.workspace.getLeaf('tab')?.openFile(entry.file);
			});
		}
	}
}
