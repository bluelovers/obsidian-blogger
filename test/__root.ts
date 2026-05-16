/**
 * 專案根路徑定義 / Project Root Path Definitions
 *
 * 使用中央化路徑管理，避免相對路徑 ../ 地獄
 * Centralized path management to avoid relative path ../../.. hell
 */
/// <reference types="node" />

import { join } from "path";

export const __ROOT = join(__dirname, '..');

export const isWin = process.platform === "win32";

export const __TEST_ROOT = join(__ROOT, "test");
export const __TEST_FIXTURES = join(__TEST_ROOT, "fixtures");
export const __TEST_TEMP = join(__TEST_ROOT, "temp");
