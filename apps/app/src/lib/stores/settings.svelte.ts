import { toast } from '$lib/services/ToastService';
import { createJobQueue } from '$lib/utils/createJobQueue';
import { createPersistedState } from '$lib/utils/createPersistedState.svelte';
import { Schema as S } from '@effect/schema';
import {
	getDefaultSettings,
	settingsSchema,
	tryAsync,
	trySync,
} from '@repo/shared';
import hotkeys from 'hotkeys-js';
import { recorder } from './recorder.svelte';

export const settings = createPersistedState({
	key: 'whispering-settings',
	schema: settingsSchema.pipe(S.mutable),
	defaultValue: getDefaultSettings('app'),
});

type RegisterShortcutJob = Promise<void>;

const unregisterAllLocalShortcuts = () =>
	trySync({
		try: () => hotkeys.unbind(),
		catch: (error) => ({
			_tag: 'WhisperingError',
			title: 'Error unregistering all shortcuts',
			description: 'Please try again.',
			action: { type: 'more-details', error },
		}),
	});

const unregisterAllGlobalShortcuts = () =>
	tryAsync({
		try: async () => {
			if (!window.__TAURI_INTERNALS__) return;
			const { unregisterAll } = await import(
				'@tauri-apps/plugin-global-shortcut'
			);
			return await unregisterAll();
		},
		catch: (error) => ({
			_tag: 'WhisperingError',
			title: 'Error unregistering all shortcuts',
			description: 'Please try again.',
			action: { type: 'more-details', error },
		}),
	});

function registerLocalShortcut({
	shortcut,
	callback,
}: {
	shortcut: string;
	callback: () => void;
}) {
	const unregisterAllLocalShortcutsResult = unregisterAllLocalShortcuts();
	if (!unregisterAllLocalShortcutsResult.ok)
		return unregisterAllLocalShortcutsResult;
	return trySync({
		try: () =>
			hotkeys(shortcut, (event, handler) => {
				// Prevent the default refresh event under WINDOWS system
				event.preventDefault();
				callback();
			}),
		catch: (error) => ({
			_tag: 'WhisperingError',
			title: 'Error registering local shortcut',
			description: 'Please make sure it is a valid keyboard shortcut.',
			action: { type: 'more-details', error },
		}),
	});
}

async function registerGlobalShortcut({
	shortcut,
	callback,
}: {
	shortcut: string;
	callback: () => void;
}) {
	const unregisterAllGlobalShortcutsResult =
		await unregisterAllGlobalShortcuts();
	if (!unregisterAllGlobalShortcutsResult.ok)
		return unregisterAllGlobalShortcutsResult;
	return trySync({
		try: async () => {
			if (!window.__TAURI_INTERNALS__) return;
			const { register } = await import('@tauri-apps/plugin-global-shortcut');
			return await register(shortcut, (event) => {
				if (event.state === 'Pressed') {
					callback();
				}
			});
		},
		catch: (error) => ({
			_tag: 'WhisperingError',
			title: 'Error registering global shortcut.',
			description: 'Please make sure it is a valid Electron keyboard shortcut.',
			action: { type: 'more-details', error },
		}),
	});
}

export const registerShortcuts = createRegisterShortcuts();

function createRegisterShortcuts() {
	const jobQueue = createJobQueue<RegisterShortcutJob>();

	const initialSilentJob = async () => {
		unregisterAllLocalShortcuts();
		await unregisterAllGlobalShortcuts();
		registerLocalShortcut({
			shortcut: settings.value.currentLocalShortcut,
			callback: recorder.toggleRecording,
		});
		await registerGlobalShortcut({
			shortcut: settings.value.currentGlobalShortcut,
			callback: recorder.toggleRecording,
		});
	};

	jobQueue.addJobToQueue(initialSilentJob());

	return {
		registerLocalShortcut: ({
			shortcut,
			callback,
		}: {
			shortcut: string;
			callback: () => void;
		}) => {
			const job = async () => {
				unregisterAllLocalShortcuts();
				registerLocalShortcut({ shortcut, callback });
				toast({
					variant: 'success',
					title: `Local shortcut set to ${shortcut}`,
					description: 'Press the shortcut to start recording',
				});
			};
			jobQueue.addJobToQueue(job());
		},
		registerGlobalShortcut: ({
			shortcut,
			callback,
		}: {
			shortcut: string;
			callback: () => void;
		}) => {
			const job = async () => {
				if (!window.__TAURI_INTERNALS__) return;
				unregisterAllGlobalShortcuts();
				await registerGlobalShortcut({ shortcut, callback });
				toast({
					variant: 'success',
					title: `Global shortcut set to ${shortcut}`,
					description: 'Press the shortcut to start recording',
				});
			};
			jobQueue.addJobToQueue(job());
		},
	};
}
