// apps/dashboard-admin/src/api/sourcesApi.ts
import {
  sourceDtoSchema,
  sourceListResponseSchema,
  type SourceCreateInput,
  type SourceDto,
  type SourceUpdateInput,
} from '@aap/shared';
import { apiDelete, apiRequest, apiWrite, type AdminResourceApi } from '@aap/ui';

/**
 * CRUD de fontes de coleta. As respostas são validadas pelos mesmos schemas que
 * o backend usa para serializá-las: uma divergência de contrato aparece aqui, e
 * não como campo indefinido no meio do formulário.
 */
export const sourcesApi: AdminResourceApi<SourceDto, SourceCreateInput, SourceUpdateInput> = {
  list: async () => {
    const { sources } = await apiRequest('/api/sources', sourceListResponseSchema);

    return sources;
  },

  create: (input) => apiWrite('/api/sources', 'POST', input, sourceDtoSchema),

  update: (id, input) => apiWrite(`/api/sources/${id}`, 'PUT', input, sourceDtoSchema),

  remove: (id) => apiDelete(`/api/sources/${id}`),
};
