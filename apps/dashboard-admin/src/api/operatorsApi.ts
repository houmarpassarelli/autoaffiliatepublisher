// apps/dashboard-admin/src/api/operatorsApi.ts
import {
  operatorDtoSchema,
  operatorListResponseSchema,
  type OperatorCreateInput,
  type OperatorDto,
  type OperatorUpdateInput,
} from '@aap/shared';
import { apiDelete, apiRequest, apiWrite, type AdminResourceApi } from '@aap/ui';

/**
 * CRUD de operadores.
 *
 * Consome `/api/operators`, que devolve o cadastro inteiro, inclusive os
 * desativados — a tela-portão do dashboard remoto usa outra rota e só enxerga
 * os ativos.
 */
export const operatorsApi: AdminResourceApi<OperatorDto, OperatorCreateInput, OperatorUpdateInput> =
  {
    list: async () => {
      const { operators } = await apiRequest('/api/operators', operatorListResponseSchema);

      return operators;
    },

    create: (input) => apiWrite('/api/operators', 'POST', input, operatorDtoSchema),

    update: (id, input) => apiWrite(`/api/operators/${id}`, 'PUT', input, operatorDtoSchema),

    remove: (id) => apiDelete(`/api/operators/${id}`),
  };
