export const BloggerClientReturnCode = {
	OK: 'OK',
	Error: 'Error',
	ServerInternalError: 'ServerInternalError',
} as const;

export type BloggerClientReturnCode =
	(typeof BloggerClientReturnCode)[keyof typeof BloggerClientReturnCode];

export const PostStatus = {
	Draft: 'DRAFT',
	Live: 'LIVE',
	Scheduled: 'SCHEDULED',
	SoftTrashed: 'SOFT_TRASHED',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

export const MathJaxOutputType = {
	TeX: 'tex',
	SVG: 'svg',
} as const;
export type MathJaxOutputType = (typeof MathJaxOutputType)[keyof typeof MathJaxOutputType];

export const ConfirmCode = {
	Confirm: 'confirm',
	Cancel: 'cancel',
} as const;
export type ConfirmCode = (typeof ConfirmCode)[keyof typeof ConfirmCode];
