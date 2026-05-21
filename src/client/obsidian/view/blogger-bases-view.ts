import { App, BasesView, QueryController, BasesPropertyId, BasesEntry } from 'obsidian';
import { EnumPostStatus } from '../../../types/const';
import { t } from '../../../utils/i18n-utils';
import { getArticleStatusInfo, applyStatusBadgeStyle } from '../../../utils/blogger-status-utils';
import { formatDate } from '../../../utils/date-utils';

/**
 * Blogger Bases View Type
 * Blogger Bases 檢視類型
 */
export const BLOGGER_BASES_VIEW_TYPE = 'blogger-bases-view';

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
 * @param app - Obsidian App 實例（用於 metadata cache 回退）/ Obsidian App instance (for metadata cache fallback)
 * @returns Blogger 內部標籤陣列 / Blogger internal tags array
 */
function _getBloggerTags(entry: BasesEntry, app?: App): string[]
{
	/**
	 * 嘗試多個可能的 tags 屬性名稱，以相容不同的 frontmatter 格式
	 * Try multiple possible tag property names for frontmatter format compatibility
	 *
	 * Obsidian 將 frontmatter tags 視為特殊屬性，Bases 系統不一定會以
	 * `note.tags` 的形式暴露。此處同時嘗試 `note.labels`（舊版相容）
	 * 與 `note.tag`（Obsidian 內部可能使用單數形式）。
	 * Obsidian treats frontmatter tags as a special property, the Bases system
	 * may not expose it via `note.tags`. Also try `note.labels` (legacy) and
	 * `note.tag` (Obsidian may use singular internally).
	 */
	const possibleProps: BasesPropertyId[] = [
		'note.tags' as BasesPropertyId,
		'note.tag' as BasesPropertyId,
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

	/**
	 * 回退方案：透過 metadata cache 直接讀取 tags
	 * Fallback: read tags directly via metadata cache
	 *
	 * 當 Bases 系統不 expose note.tags 時，直接從 Obsidian 的 metadata cache
	 * 讀取 tags 資訊。優先使用 frontmatter tags，若無則使用 inline tags。
	 * When Bases does not expose note.tags, read tags directly from Obsidian's
	 * metadata cache. Prefers frontmatter tags, falls back to inline tags.
	 */
	if (app && entry.file)
	{
		const metadata = app.metadataCache.getFileCache(entry.file);

		/** 嘗試 frontmatter tags / Try frontmatter tags */
		const frontmatterTags = metadata?.frontmatter?.tags;
		if (Array.isArray(frontmatterTags) && frontmatterTags.length > 0)
		{
			return frontmatterTags.map(String);
		}

		/** 嘗試 inline tags：metadata?.tags 為 TagCache[]（{ tag, position } 格式）/ Try inline tags */
		const inlineTags = metadata?.tags;
		if (Array.isArray(inlineTags) && inlineTags.length > 0)
		{
			return inlineTags.map(t => t.tag.replace(/^#/, ''));
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

	/** Obsidian App 實例（用於存取 metadata cache）/ Obsidian App instance (for metadata cache access) */
	private _app: App;

	/**
	 * 建立 Blogger Bases 檢視實例
	 * Create Blogger Bases View instance
	 *
	 * @param controller - QueryController 實例 / QueryController instance
	 * @param parentEl - 父容器元素 / Parent container element
	 * @param app - Obsidian App 實例 / Obsidian App instance
	 */
	constructor(controller: QueryController, parentEl: HTMLElement, app: App)
	{
		super(controller);

		/** 建立檢視容器 */
		this.containerEl = parentEl.createDiv('blogger-bases-view-container');
		this._app = app;
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
			const bloggerTags = _getBloggerTags(entry, this._app);
			const { status, statusLabel, statusClass } = getArticleStatusInfo(bloggerTags);

			/** 狀態標籤（彩色徽章） */
			const statusEl = metaEl.createSpan({
				cls: `blogger-status-badge ${statusClass}`,
				text: statusLabel,
			});

			/** 狀態色彩 */
			applyStatusBadgeStyle(statusEl, status);

			/** 日期資訊（發布日或更新日） */
			const published = _getStringValue(entry, 'note.blogger.published' as BasesPropertyId);
			const updated = _getStringValue(entry, 'note.blogger.updated' as BasesPropertyId);

			if (published || updated)
			{
				const dateEl = metaEl.createSpan({
					cls: 'blogger-bases-date',
				});
				const dateText = updated
					? t('bloggerDashboard_updatedAt', { date: formatDate(updated) })
					: t('bloggerDashboard_publishedAt', { date: formatDate(published) });
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
