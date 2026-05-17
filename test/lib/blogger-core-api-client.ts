import { BloggerCoreApiClient } from '../../src/client/blogger/blogger-core-api-client';
import { BloggerRestClientGoogleOAuth2Context } from '../../src/client/blogger/blogger-rest-client-google-o-auth2-context';
import { RestClient } from '../../src/client/blogger/rest-client';
import { BLOGGER_API_ENDPOINT } from '../../src/consts';
import { nodeRequest } from './node-request';
import { loadCredentials, DRAFT_POST_ID } from './test-utils';

export async function createBloggerCoreApiClient()
{
	/** ===== 1. 載入憑證 ===== */
	const creds = await loadCredentials();
	console.log(`  Blog ID: ${creds.blogId}`);
	console.log(`  Target:  POST ${DRAFT_POST_ID}  (未命名3333)`);

	/** ===== 2. 建立客戶端 ===== */
	const restClient = new RestClient(
		{ url: new URL(BLOGGER_API_ENDPOINT) },
		nodeRequest,
	);

	/** ===== 3. 建立上下文 ===== */
	const context = new BloggerRestClientGoogleOAuth2Context(creds.blogId);

	/** ===== 4. 建立核心客戶端 ===== */
	const coreClient = new BloggerCoreApiClient(
		restClient,
		context,
		creds.blogId,
		async () => ({ authorization: `Bearer ${creds.accessToken}` })
	);

	return coreClient;
}
