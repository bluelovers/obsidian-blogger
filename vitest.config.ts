/**
 * Vitest 設定
 * Vitest configuration
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		/** 測試檔案位置 / Test file location */
		include: ['test/**/*.spec.ts'],

		/** 不包含其他測試目錄 / Exclude other test directories */
		exclude: ['node_modules', 'dist'],
	},
});
