import { IBloggerClientResult, IBloggerPublishResult } from '../../../types/blogger-client-interface';
import { EnumBloggerClientReturnCode, EnumPostStatus } from '../../../types/const';

export function _extractStatusCore(data: {
	status?: any
}, defaultPostStatus?: EnumPostStatus)
{
	switch (data?.status)
	{
		case EnumPostStatus.Draft:
			return EnumPostStatus.Draft;
		case EnumPostStatus.Live:
			return EnumPostStatus.Live;
	}

	return defaultPostStatus
}

/**
 * 從 API 回應中安全提取文章狀態
 * Safely extract post status from an API response
 *
 * @param resp - API 回應結果 / API response result
 * @returns 文章狀態 / Post status
 */
export function extractStatusFromBloggerClient(resp: IBloggerClientResult<IBloggerPublishResult>): EnumPostStatus
{
	if (resp.code !== EnumBloggerClientReturnCode.OK || !resp.data)
	{
		return EnumPostStatus.Draft; // default fallback if error
	}
	/**
	 * 若無 status，因為 getPost 對 LIVE 不回傳 status，預設為 LIVE
	 * If no status is present, default to LIVE since getPost does not return status for LIVE posts
	 *
	 * @todo 需要驗證此說明是否正確
	 */
	return _extractStatusCore(resp.data, EnumPostStatus.Live)!;
}
