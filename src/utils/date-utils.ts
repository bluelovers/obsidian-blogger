/**
 * 格式化 ISO 日期字串為 `YYYY-MM-DD HH:mm` 格式
 * Format ISO date string to `YYYY-MM-DD HH:mm` format
 *
 * @param isoString - ISO 8601 日期字串 / ISO 8601 date string
 * @returns 格式化後的日期文字，無效輸入回傳 '—' / Formatted date text, '—' for invalid input
 */
export function formatDate(isoString?: string | null): string
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
