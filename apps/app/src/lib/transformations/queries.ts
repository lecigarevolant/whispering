import type { Transformation } from '$lib/services/db';
import { DbService, queryClient } from '$lib/services/index.js';
import { toast } from '$lib/services/toast';
import { createQuery } from '@tanstack/svelte-query';

// Define the query key as a constant array
export const transformationsKeys = {
	all: ['transformations'] as const,
	byId: (id: string) => ['transformations', id] as const,
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

export const createTransformationQuery = (id: string) =>
	createQuery(() => ({
		queryKey: transformationsKeys.byId(id),
		queryFn: async () => {
			const result = await DbService.getTransformationById(id);
			if (!result.ok) {
				toast.error({
					title: 'Failed to fetch transformation!',
					description: 'Your transformation could not be fetched.',
					action: { type: 'more-details', error: result.error },
				});
				throw result.error;
			}
			return result.data;
		},
		initialData: () =>
			queryClient
				.getQueryData<Transformation[]>(transformationsKeys.all)
				?.find((t) => t.id === id),
		initialDataUpdatedAt: () =>
			queryClient.getQueryState(transformationsKeys.byId(id))?.dataUpdatedAt,
	}));
