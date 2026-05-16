import { App, Notice, moment } from 'obsidian';
import { ILanguageID } from '../../i18n/langs';
import { EnumLanguageIDAll } from '../../types/const';

export function createObsidianContext(context: {
	app?: App,
})
{
	context ??= {};
	return {
		app: context.app!,
		notice(message: string | DocumentFragment, duration?: number)
		{
			try
			{
				return new (require('obsidian').Notice as typeof Notice)(message, duration);
			}
			catch (error)
			{

			}
		},
		get locale()
		{
			let lang: ILanguageID;
			try
			{
				lang = (require('obsidian').moment as typeof moment).locale().replace('-', '_') as ILanguageID;
			}
			catch (error)
			{

			}

			return lang! || EnumLanguageIDAll.en;
		}
	};
}

export type IObsidianContext = ReturnType<typeof createObsidianContext>;
