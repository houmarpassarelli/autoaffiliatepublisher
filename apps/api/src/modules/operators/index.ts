// apps/api/src/modules/operators/index.ts

export { operatorRoutes } from './operatorRoutes.js';
export { toOperatorDto } from './operatorMapper.js';
export {
  createOperator,
  deleteOperator,
  listOperators,
  updateOperator,
} from './operatorService.js';
