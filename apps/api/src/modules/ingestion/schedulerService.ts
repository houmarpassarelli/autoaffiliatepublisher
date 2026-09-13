// apps/api/src/modules/ingestion/schedulerService.ts
import * as cron from 'node-cron';
import { SourceModel, type SourceDocument } from '../../database/models/sourceModel.js';
import { runIngestionForSource } from './ingestionRunner.js';

/**
 * Mapa em memória dos cron jobs agendados, indexados pelo ID da fonte.
 */
const scheduledTasks = new Map<string, cron.ScheduledTask>();

/**
 * Inicia o agendador de varredura.
 * Busca todas as fontes habilitadas que possuem cronExpression
 * e agenda a execução da ingestão.
 */
export async function startIngestionScheduler(): Promise<void> {
  try {
    const activeSources = await SourceModel.find({ active: true });

    for (const source of activeSources) {
      if (source.cronExpression) {
        scheduleSourceJob(source);
      }
    }
    console.log(`[IngestionScheduler] Inicializado com ${scheduledTasks.size} fontes.`);
  } catch (error) {
    console.error('[IngestionScheduler] Falha ao iniciar:', error);
  }
}

/**
 * Para todos os jobs agendados. Útil no desligamento gracioso.
 */
export function stopIngestionScheduler(): void {
  for (const task of scheduledTasks.values()) {
    task.stop();
  }
  scheduledTasks.clear();
  console.log('[IngestionScheduler] Parado.');
}

/**
 * Agenda (ou reagenda) o cron job de uma fonte.
 * @param source Documento da fonte a ser agendada.
 */
export function scheduleSourceJob(source: SourceDocument): void {
  const sourceId = source._id.toString();
  
  // Se já existir, paramos o atual para substituir
  removeSourceCron(sourceId);

  if (!source.active || !source.cronExpression) {
    return;
  }

  const isValid = cron.validate(source.cronExpression);
  if (!isValid) {
    console.warn(`[IngestionScheduler] Fonte ${source.name} ignorada: cronExpression inválida (${source.cronExpression})`);
    return;
  }

  const task = cron.schedule(source.cronExpression, async () => {
    console.log(`[IngestionScheduler] Iniciando varredura para a fonte: ${source.name}`);
    try {
      await runIngestionForSource(source);
    } catch (error) {
      console.error(`[IngestionScheduler] Erro na varredura da fonte ${source.name}:`, error);
    }
  });

  scheduledTasks.set(sourceId, task);
}

/**
 * Remove o cron job associado a uma fonte, se existir.
 * @param sourceId ID da fonte.
 */
export function removeSourceCron(sourceId: string): void {
  const existingTask = scheduledTasks.get(sourceId);
  if (existingTask) {
    existingTask.stop();
    scheduledTasks.delete(sourceId);
  }
}
