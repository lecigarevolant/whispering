import { DbService } from '$lib/services.svelte';
import { toast } from '$lib/utils/toast';
import { createQuery } from '@tanstack/svelte-query';

// Define the query key as a constant array
export const transformationsKeys = {
	all: ['transformations'] as const,
};

export const createTransformationsQuery = () =>
	createQuery(() => ({
		queryKey: transformationsKeys.all,
		queryFn: async () => {
			const result = await DbService.getAllTransformations();
			if (!result.ok) {
				toast.error({
					title: 'Failed to fetch transformations!',
					description: 'Your transformations could not be fetched.',
					action: { type: 'more-details', error: result.error },
				});
				throw result.error;
			}
			return result.data;
		},
	}));
