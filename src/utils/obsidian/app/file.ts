import { App } from 'obsidian';

export function getActiveFile(app: App)
{
	return app.workspace.getActiveFile();
}
