/**
 * Markdown/HTML 轉換測試資料集
 * Markdown/HTML conversion test dataset
 *
 * 定義了各類 Markdown 與對應 HTML 的測試案例，
 * 涵蓋基本內聯元素、標題、列表、連結、區塊元素、
 * 混合內容與邊界情況。
 * Defines test cases for various Markdown and corresponding HTML patterns,
 * covering basic inline elements, headings, lists, links, block elements,
 * mixed content, and edge cases.
 */

/** ==================== 型別定義 / Type Definitions ==================== */

/**
 * 測試案例群組介面
 * Test case group interface
 */
export interface ITestGroup
{
	/** 群組名稱 / Group name */
	name: string;
	/** 測試案例陣列 / Test case array */
	testCases: ITestInput[];
}

/**
 * 測試案例輸入介面
 * Test case input interface
 */
export interface ITestInput
{
	/** 測試案例名稱 / Test case name */
	name: string;
	/** Markdown 輸入 / Markdown input */
	md: string;
	/** HTML 輸入 / HTML input */
	html: string;
	/** 是否跳過此案例（用於已知有問題的案例）/ Whether to skip this case */
	skip?: boolean;
}

/** ====================  MD→HTML 轉換後預期結果類型 ==================== */

/**
 * 單一方向轉換測試結果
 * Single direction conversion test result
 */
export interface IConversionResult
{
	/** 測試案例名稱 / Test case name */
	name: string;
	/** 輸入內容 / Input content */
	input: string;
	/** 轉換結果 / Conversion result */
	output: string;
}

/**
 * 單一方向轉換測試群組結果
 * Single direction conversion test group result
 */
export interface IConversionGroupResult
{
	/** 群組名稱 / Group name */
	groupName: string;
	/** 測試結果陣列 / Test result array */
	results: IConversionResult[];
}

/** ==================== Round-Trip 結果類型 ==================== */

/**
 * Round-trip 轉換測試結果
 * Round-trip conversion test result
 */
export interface IRoundTripResult
{
	/** 測試案例名稱 / Test case name */
	name: string;
	/** 原始 Markdown / Original Markdown */
	originalMd: string;
	/** 中間 HTML / Intermediate HTML */
	intermediateHtml: string;
	/** 轉換回來的 Markdown / Converted back Markdown */
	roundTripMd: string;
	/** 是否相等 / Whether equal */
	isEqual: boolean;
}

/** ==================== 測試資料 / Test Data ==================== */

/** ==================== Group 1: 基本內聯元素 ==================== */

export const INLINE_ELEMENTS: ITestGroup = {
	name: 'Basic Inline Elements',
	testCases: [
		{
			name: 'plain paragraph',
			md: 'Hello world',
			html: '<p>Hello world</p>',
		},
		{
			name: 'bold text',
			md: 'This is **bold** text',
			html: '<p>This is <strong>bold</strong> text</p>',
		},
		{
			name: 'italic text',
			md: 'This is *italic* text',
			html: '<p>This is <em>italic</em> text</p>',
		},
		{
			name: 'bold and italic combined',
			md: '***bold italic*** and **bold *italic***',
			html: '<p><em><strong>bold italic</strong></em> and <strong>bold <em>italic</em></strong></p>',
		},
		{
			name: 'inline code',
			md: 'Use the `console.log()` function',
			html: '<p>Use the <code>console.log()</code> function</p>',
		},
		{
			name: 'strikethrough',
			md: 'This is ~~deleted~~ text',
			html: '<p>This is <s>deleted</s> text</p>',
		},
	],
};

/** ==================== Group 2: 標題 ==================== */

export const HEADINGS: ITestGroup = {
	name: 'Headings',
	testCases: [
		{
			name: 'h1',
			md: '# Heading 1',
			html: '<h1>Heading 1</h1>',
		},
		{
			name: 'h2',
			md: '## Heading 2',
			html: '<h2>Heading 2</h2>',
		},
		{
			name: 'h3',
			md: '### Heading 3',
			html: '<h3>Heading 3</h3>',
		},
		{
			name: 'h4',
			md: '#### Heading 4',
			html: '<h4>Heading 4</h4>',
		},
		{
			name: 'h5',
			md: '##### Heading 5',
			html: '<h5>Heading 5</h5>',
		},
		{
			name: 'h6',
			md: '###### Heading 6',
			html: '<h6>Heading 6</h6>',
		},
	],
};

/** ==================== Group 3: 連結與圖片 ==================== */

export const LINKS_AND_IMAGES: ITestGroup = {
	name: 'Links and Images',
	testCases: [
		{
			name: 'basic link',
			md: '[OpenAI](https://openai.com)',
			html: '<p><a href="https://openai.com">OpenAI</a></p>',
		},
		{
			name: 'link with title',
			md: '[OpenAI](https://openai.com "Visit OpenAI")',
			html: '<p><a href="https://openai.com" title="Visit OpenAI">OpenAI</a></p>',
		},
		{
			name: 'image',
			md: '![Alt text](https://example.com/image.png)',
			html: '<p><img src="https://example.com/image.png" alt="Alt text"></p>',
		},
		{
			name: 'image with title',
			md: '![Alt text](https://example.com/image.png "Title")',
			html: '<p><img src="https://example.com/image.png" alt="Alt text" title="Title"></p>',
		},
		{
			name: 'link in paragraph',
			md: 'Visit [OpenAI](https://openai.com) for more info.',
			html: '<p>Visit <a href="https://openai.com">OpenAI</a> for more info.</p>',
		},
	],
};

/** ==================== Group 4: 列表 ==================== */

export const LISTS: ITestGroup = {
	name: 'Lists',
	testCases: [
		{
			name: 'unordered list',
			md: '- Item 1\n- Item 2\n- Item 3',
			html: '<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li>\n</ul>',
		},
		{
			name: 'ordered list',
			md: '1. First\n2. Second\n3. Third',
			html: '<ol>\n<li>First</li>\n<li>Second</li>\n<li>Third</li>\n</ol>',
		},
		{
			name: 'nested unordered list',
			md: '- Parent 1\n  - Child 1\n  - Child 2\n- Parent 2',
			html: '<ul>\n<li>Parent 1\n<ul>\n<li>Child 1</li>\n<li>Child 2</li>\n</ul>\n</li>\n<li>Parent 2</li>\n</ul>',
		},
		{
			name: 'unordered with inline formatting',
			md: '- **Bold item**\n- *Italic item*\n- `code item`',
			html: '<ul>\n<li><strong>Bold item</strong></li>\n<li><em>Italic item</em></li>\n<li><code>code item</code></li>\n</ul>',
		},
	],
};

/** ==================== Group 5: 區塊元素 ==================== */

export const BLOCK_ELEMENTS: ITestGroup = {
	name: 'Block Elements',
	testCases: [
		{
			name: 'blockquote',
			md: '> This is a blockquote',
			html: '<blockquote>\n<p>This is a blockquote</p>\n</blockquote>',
		},
		{
			name: 'blockquote with multiple paragraphs',
			md: '> First paragraph\n>\n> Second paragraph',
			html: '<blockquote>\n<p>First paragraph</p>\n<p>Second paragraph</p>\n</blockquote>',
		},
		{
			name: 'fenced code block',
			md: '```\nconst x = 1;\nconsole.log(x);\n```',
			html: '<pre><code>const x = 1;\nconsole.log(x);\n</code></pre>',
		},
		{
			name: 'fenced code block with language',
			md: '```javascript\nconst x = 1;\nconsole.log(x);\n```',
			html: '<pre><code class="language-javascript">const x = 1;\nconsole.log(x);\n</code></pre>',
		},
		{
			name: 'horizontal rule',
			md: '---',
			html: '<hr>\n',
		},
	],
};

/** ==================== Group 6: 混合內容 ==================== */

export const MIXED_CONTENT: ITestGroup = {
	name: 'Mixed Content',
	testCases: [
		{
			name: 'heading with paragraph',
			md: '# Title\n\nThis is a paragraph after the title.',
			html: '<h1>Title</h1>\n<p>This is a paragraph after the title.</p>',
		},
		{
			name: 'multiple paragraphs',
			md: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
			html: '<p>First paragraph.</p>\n<p>Second paragraph.</p>\n<p>Third paragraph.</p>',
		},
		{
			name: 'blockquote with list inside',
			md: '> A blockquote\n> - with a list\n> - inside it',
			html: '<blockquote>\n<p>A blockquote</p>\n<ul>\n<li>with a list</li>\n<li>inside it</li>\n</ul>\n</blockquote>',
		},
	],
};

/** ==================== Group 7: 邊界情況 ==================== */

export const EDGE_CASES: ITestGroup = {
	name: 'Edge Cases',
	testCases: [
		{
			name: 'empty string',
			md: '',
			html: '',
		},
		{
			name: 'only whitespace',
			md: '   \n\n  ',
			html: '',
		},
		{
			name: 'special HTML characters',
			md: 'AT&T uses <tag> & "quotes"',
			html: '<p>AT&amp;T uses &lt;tag&gt; &amp; &quot;quotes&quot;</p>',
		},
		{
			name: 'multiple blank lines',
			md: 'Line 1\n\n\n\nLine 2',
			html: '<p>Line 1</p>\n<p>Line 2</p>',
		},
	],
};

/** ==================== 完整測試資料集 ==================== */

/**
 * 所有測試群組陣列 / All test groups array
 *
 * 用於自動遍歷並測試所有方向的轉換。
 * Used to automatically iterate and test all conversion directions.
 */
export const ALL_TEST_GROUPS: ITestGroup[] = [
	INLINE_ELEMENTS,
	HEADINGS,
	LINKS_AND_IMAGES,
	LISTS,
	BLOCK_ELEMENTS,
	MIXED_CONTENT,
	EDGE_CASES,
];
