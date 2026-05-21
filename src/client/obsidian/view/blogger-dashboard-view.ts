import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { IMatterData, IBloggerMeta } from '../../../types/types';
import { EnumPostStatus, EnumobsidianBloggerTags } from '../../../types/const';
import { IObsidianContext } from '../../../utils/obsidian/obsidian-context';
import { t } from '../../../utils/i18n-utils';
import { getArticleStatusInfo, applyStatusBadgeStyle } from '../../../utils/blogger-status-utils';
import { formatDate } from '../../../utils/date-utils';

/**
 * Blogger Dashboard View Type
 * Blogger 儀表板檢視類型
 */
export const BLOGGER_DASHBOARD_VIEW_TYPE = 'blogger-dashboard-view';

/**
 * Blogger 儀表板文章條目介面
 * Blogger dashboard article entry interface
 */
interface IDashboardArticle
{
	/** 檔案物件 / File object */
	file: TFile;

	/** 文章標題 / Article title */
	title: string;

	/** 發布狀態 / Post status */
	status: EnumPostStatus | undefined;

	/** 文字化狀態描述 / Status display text */
	statusLabel: string;

	/** 狀態 CSS 類別 / Status CSS class */
	statusClass: string;

	/** 發布日期（ISO 8601）/ Published date (ISO 8601) */
	published?: string;

	/** 更新日期（ISO 8601）/ Updated date (ISO 8601) */
	updated?: string;

	/** 文章縮圖 URL / Thumbnail URL */
	thumbnail?: string;

	/** 文章網址 / Article URL */
	url?: string;
}


/**
 * Blogger 儀表板檢視類別
 * Blogger Dashboard View class
 *
 * 在 Obsidian 側邊欄顯示已發布 Blogger 文章的狀態資訊。
 * Displays status information of published Blogger posts in the Obsidian sidebar.
 */
export class BloggerDashboardView extends ItemView
{
	protected articles: IDashboardArticle[] = [];
	protected container: HTMLElement | null = null;
	protected readonly refreshHandler: (...args: any[]) => void;

	/**
	 * 建立 Blogger 儀表板檢視實例
	 * Create Blogger Dashboard View instance
	 *
	 * @param leaf - Workspace Leaf / Workspace leaf
	 * @param ctx - Obsidian 上下文 / Obsidian context
	 */
	constructor(
		leaf: WorkspaceLeaf,
		protected ctx: IObsidianContext,
	)
	{
		super(leaf);

		/** 註冊 metadataCache 變更監聽，Frontmatter 變更時自動重新整理 */
		this.refreshHandler = () =>
		{
			this.refresh();
		};
	}

	/**
	 * 取得檢視類型名稱
	 * Get view type name
	 */
	getViewType(): string
	{
		return BLOGGER_DASHBOARD_VIEW_TYPE;
	}

	/**
	 * 取得顯示名稱
	 * Get display text
	 */
	getDisplayText(): string
	{
		return t('bloggerDashboard_title');
	}

	/**
	 * 取得圖示
	 * Get icon
	 */
	getIcon(): string
	{
		return 'blogger-logo';
	}

	/**
	 * 檢視載入時的處理邏輯
	 * Handling logic when view is loaded
	 */
	async onload(): Promise<void>
	{
		super.onload();

		/** 註冊 Frontmatter 變更監聽事件 */
		this.registerEvent(
			this.app.metadataCache.on('changed', this.refreshHandler),
		);

		/** 初始化渲染 */
		this.render();
	}

	/**
	 * 檢視卸載時的清理邏輯
	 * Cleanup logic when view is unloaded
	 */
	onunload(): void
	{
		super.onunload();
	}

	/**
	 * 掃描 Vault 並重新整理文章清單
	 * Scan vault and refresh the article list
	 */
	protected refresh(): void
	{
		this.articles = this.scanArticles();
		this.renderContent();
	}

	/**
	 * 初始化渲染（建立容器結構）
	 * Initial render (create container structure)
	 */
	protected render(): void
	{
		const container = this.containerEl;
		container.empty();

		/** 建立標題區域 */
		container.createEl('div', {
			cls: 'blogger-dashboard-header',
			text: t('bloggerDashboard_title'),
		});

		/** 建立清單容器 */
		this.container = container.createEl('div', {
			cls: 'blogger-dashboard-list',
		});

		/** 初始掃描並顯示文章 */
		this.refresh();
	}

	/**
	 * 掃描 Vault 中所有帶有 obsidian-blogger/post 標籤的檔案
	 * Scan vault for all files with obsidian-blogger/post tag
	 *
	 * @returns 文章條目列表 / Article entry list
	 */
	protected scanArticles(): IDashboardArticle[]
	{
		const markdownFiles = this.app.vault.getMarkdownFiles();
		const articles: IDashboardArticle[] = [];

		for (const file of markdownFiles)
		{
			const cache = this.app.metadataCache.getFileCache(file);

			/** 確保 Frontmatter 存在 */
			const frontmatter = cache?.frontmatter as IMatterData | undefined;
			if (!frontmatter) continue;

			/** 檢查是否有 obsidian-blogger/post 標籤 */
			const tags = frontmatter.tags ?? frontmatter.labels;
			if (!Array.isArray(tags)) continue;
			if (!tags.includes(EnumobsidianBloggerTags.Post)) continue;

			const { status, statusLabel, statusClass } = getArticleStatusInfo(tags);
			const bloggerMeta: IBloggerMeta | undefined = frontmatter.blogger;

			articles.push({
				file,
				title: frontmatter.title ?? file.basename,
				status,
				statusLabel,
				statusClass,
				published: bloggerMeta?.published,
				updated: bloggerMeta?.updated,
				thumbnail: bloggerMeta?.thumbnail,
				url: frontmatter.url,
			});
		}

		/** 依更新日期降冪排序（無日期者排在最後） */
		articles.sort((a, b) =>
		{
			const dateA = a.updated ?? a.published ?? '';
			const dateB = b.updated ?? b.published ?? '';
			return dateB.localeCompare(dateA);
		});

		return articles;
	}

	/**
	 * 渲染文章清單內容
	 * Render article list content
	 */
	protected renderContent(): void
	{
		if (!this.container) return;

		this.container.empty();

		/** 無文章時顯示佔位提示 */
		if (this.articles.length === 0)
		{
			this.container.createEl('div', {
				cls: 'blogger-dashboard-empty',
				text: t('bloggerDashboard_empty'),
			});
			return;
		}

		/** 建立文章列表 */
		const listEl = this.container.createEl('div', {
			cls: 'blogger-dashboard-items',
		});

		for (const article of this.articles)
		{
			this.renderArticleItem(listEl, article);
		}
	}

	/**
	 * 渲染單一文章項目
	 * Render a single article item
	 *
	 * @param parentEl - 父層 HTMLElement / Parent HTMLElement
	 * @param article - 文章條目 / Article entry
	 */
	protected renderArticleItem(parentEl: HTMLElement, article: IDashboardArticle): void
	{
		const itemEl = parentEl.createEl('div', {
			cls: 'blogger-dashboard-item',
		});

		/** 點擊開啟檔案 */
		itemEl.addEventListener('click', () =>
		{
			this.openArticle(article);
		});

		/** 文章縮圖（若有） */
		if (article.thumbnail)
		{
			const thumbEl = itemEl.createEl('img', {
				cls: 'blogger-dashboard-thumbnail',
			});
			thumbEl.src = article.thumbnail;
			thumbEl.alt = article.title;
			thumbEl.style.width = '100%';
			thumbEl.style.maxHeight = '120px';
			thumbEl.style.objectFit = 'cover';
			thumbEl.style.borderRadius = '4px';
		}

		/** 文章標題 */
		itemEl.createEl('div', {
			cls: 'blogger-dashboard-title',
			text: article.title,
		});

		/** 文章資訊行（狀態 + 日期） */
		const metaEl = itemEl.createEl('div', {
			cls: 'blogger-dashboard-meta',
		});

		/** 狀態標籤 */
		const statusEl = metaEl.createEl('span', {
			cls: `blogger-status-badge ${article.statusClass}`,
			text: article.statusLabel,
		});
		statusEl.style.display = 'inline-block';
		statusEl.style.padding = '2px 6px';
		statusEl.style.borderRadius = '3px';
		statusEl.style.fontSize = 'var(--font-smallest)';
		statusEl.style.fontWeight = '600';

		/** 狀態色彩 */
		applyStatusBadgeStyle(statusEl, article.status);

		/** 日期資訊 */
		const dateEl = metaEl.createEl('span', {
			cls: 'blogger-dashboard-date',
		});
		dateEl.style.marginLeft = '8px';
		dateEl.style.fontSize = 'var(--font-smallest)';
		dateEl.style.color = 'var(--text-muted)';

		if (article.published || article.updated)
		{
			const dateText = article.updated
				? t('bloggerDashboard_updatedAt', { date: formatDate(article.updated) })
				: t('bloggerDashboard_publishedAt', { date: formatDate(article.published) });
			dateEl.textContent = dateText;
		}

		/** 分隔線 */
		itemEl.createEl('hr', {
			cls: 'blogger-dashboard-divider',
		});
	}

	/**
	 * 點擊文章時開啟對應檔案
	 * Open the corresponding file when clicking on an article
	 *
	 * @param article - 文章條目 / Article entry
	 */
	protected async openArticle(article: IDashboardArticle): Promise<void>
	{
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.openFile(article.file);
	}
}
