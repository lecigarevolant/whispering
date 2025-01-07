import { userConfiguredServices } from '$lib/services/index.js';
import { toast } from '$lib/services/toast';

import { createQuery } from '@tanstack/svelte-query';

// Define the query key as a constant array
export const recordingsKeys = {
	all: ['recordings'] as const,
};

export const createRecordingsQuery = () =>
	createQuery(() => ({
		queryKey: recordingsKeys.all,
		queryFn: async () => {
			const result = await userConfiguredServices.db.getAllRecordings();
			if (!result.ok) {
				toast.error({
					title: 'Failed to fetch recordings!',
					description: 'Your recordings could not be fetched.',
					action: { type: 'more-details', error: result.error },
				});
				throw result.error;
			}
			return result.data;
		},
	}));
