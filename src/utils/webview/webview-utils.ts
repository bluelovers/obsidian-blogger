import { IURLInput } from '../../types/types';

/**
 * 使用瀏覽器開啟網址
 * Open URL with browser
 *
 * @param url - 要開啟的網址 / URL to open
 */
export function openWithBrowser(
	url: IURLInput,
): void
{
	window.open(`${url}`);
}
