import { toggleRecording } from '~background/messages/app/toggleRecording';
import { extension } from '../lib/extension';

chrome.runtime.onInstalled.addListener(async (details) => {
	if (details.reason === 'install') await chrome.runtime.openOptionsPage();
});

chrome.commands.onCommand.addListener(async (command) => {
	console.info('Received command via Chrome Keyboard Shortcut', command);
	if (command !== 'toggleRecording') return;
	const toggleRecordingResult = await toggleRecording();
	if (!toggleRecordingResult.ok) {
		await extension.createNotification({
			notifyOptions: toggleRecordingResult.error,
		});
	}
});
