import { App, Notice, moment } from 'obsidian';
import { ILanguageID } from '../../i18n/langs';
import { EnumLanguageIDAll } from '../../types/const';

export function createObsidianContext(context: {
	app?: App,
	Notice?: typeof Notice,
})
{
	context ??= {};
	return {
		app: context.app!,
		notice(message: string | DocumentFragment, duration?: number)
		{
			if (context.Notice)
			{
				new context.Notice!(message, duration);
			}
		},
		get locale()
		{
			let lang: ILanguageID;
			try
			{
				lang = require('obsidian').moment.locale().replace('-', '_') as ILanguageID;
			}
			catch (error)
			{

			}

			return lang! || EnumLanguageIDAll.en;
		}
	};
}

export type IObsidianContext = ReturnType<typeof createObsidianContext>;
