// apps/dashboard-remote/src/components/OfferCard.tsx
import { useState } from 'react';
import { DispatchActionType, OfferStatus, type ChannelDto, type OfferDto } from '@aap/shared';
import {
  Alert,
  ApiError,
  Badge,
  Button,
  describeError,
  formatCurrency,
  formatDateTime,
  formatDiscount,
} from '@aap/ui';
import { discardOffer, dispatchOffer, regenerateCopy } from '../api/offersApi.js';
import type { OfferTransition } from '../state/useOfferBoard.js';
import { ChannelSelector } from './ChannelSelector.js';
import { OfferCountdown } from './OfferCountdown.js';

export interface OfferCardProps {
  offer: OfferDto;
  /** Canais ativos, base do seletor. Vazio bloqueia a publicação. */
  channels: ChannelDto[];
  /** Operador que assina a ação — vem da tela-portão. */
  operator: { id: string; name: string };
  /** Transição confirmada pelo servidor, aplicada ao quadro local. */
  onResolved: (transition: OfferTransition) => void;
  /** A oferta deixou de ser desta tela: outro operador a resolveu antes. */
  onVanish: (offerId: string) => void;
}

/** Ação em andamento, para desabilitar os dois botões e trocar o rótulo do certo. */
type PendingAction = 'dispatch' | 'discard' | 'copy' | 'regenerate' | null;

/** Preço, desconto e o menor valor já visto — o insumo da decisão editorial. */
function PriceBlock({ offer }: { offer: OfferDto }): React.JSX.Element {
  return (
    <div className="d-flex flex-wrap align-items-baseline gap-2">
      <span className="text-secondary text-decoration-line-through">
        {formatCurrency(offer.priceOriginal)}
      </span>
      <span className="fs-2 fw-bold">{formatCurrency(offer.priceCurrent)}</span>
      <Badge tone="success">-{formatDiscount(offer.discountPct)}</Badge>
      {offer.lowestPriceSeen !== null && offer.priceCurrent <= offer.lowestPriceSeen ? (
        <Badge tone="info">Menor preço já registrado</Badge>
      ) : null}
    </div>
  );
}

/**
 * Card de oferta do Dashboard Remoto.
 *
 * Concentra as duas ações resolutivas. Ambas seguem o mesmo caminho — comando por
 * HTTP, decisão no servidor, propagação por broadcast — e diferem apenas no que
 * declaram: "Publicar" leva os canais escolhidos e produz auditoria; "Descartar"
 * é terminal e alimenta o histórico anti-recaptura.
 *
 * O componente nunca decide o destino da oferta: ele exibe o que o servidor
 * respondeu. É a fronteira do Thin Client dentro da interface.
 */
export function OfferCard({
  offer: initialOffer,
  channels,
  operator,
  onResolved,
  onVanish,
}: OfferCardProps): React.JSX.Element {
  const [offer, setOffer] = useState(initialOffer);

  /**
   * O estado guarda o que o operador **desmarcou**, e não o que está marcado.
   *
   * Assim a regra "todas as caixas vêm pré-marcadas" continua valendo quando a
   * lista de canais muda embaixo do card — um canal criado no painel
   * administrativo chega já marcado, via CHANNELS_UPDATED, sem apagar as
   * exclusões que o operador já tinha feito neste card.
   */
  const [deselectedChannels, setDeselectedChannels] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  /**
   * A imagem vem da loja de origem e pode simplesmente não carregar — produto
   * removido, host fora do ar, hotlink bloqueado. Sem tratamento, o card exibe o
   * ícone de imagem quebrada bem no lugar onde o operador olha primeiro. O
   * espaço é preservado para que a lista não mude de altura de um card para outro.
   */
  const [imageFailed, setImageFailed] = useState(false);

  const isOpen = offer.status === OfferStatus.OPEN;
  const selectedChannels = channels
    .map((channel) => channel.key)
    .filter((key) => !deselectedChannels.includes(key));

  /** Converte a seleção devolvida pelo seletor na exclusão que este card guarda. */
  function handleSelectionChange(selected: string[]): void {
    setDeselectedChannels(
      channels.map((channel) => channel.key).filter((key) => !selected.includes(key)),
    );
  }

  /**
   * Executa a ação resolutiva e trata o desfecho.
   *
   * O 409 recebe tratamento próprio: não é falha do sistema nem do operador — é
   * a trava de concorrência funcionando. O card sai da tela e a mensagem explica
   * o que aconteceu, em vez de sugerir nova tentativa sobre algo já resolvido.
   */
  async function runResolution(
    action: Exclude<PendingAction, null>,
    execute: () => Promise<OfferTransition | void>,
  ): Promise<void> {
    setPending(action);
    setError(null);

    try {
      const result = await execute();
      if (result) {
        onResolved(result);
      }
    } catch (resolutionError) {
      if (resolutionError instanceof ApiError && resolutionError.isConflict) {
        onVanish(offer.id);

        return;
      }

      setError(describeError(resolutionError));
    } finally {
      setPending(null);
    }
  }

  /** Clique em "Publicar": envia o payload de comando e não processa envio algum aqui. */
  function handleDispatch(): void {
    void runResolution('dispatch', async () => {
      const result = await dispatchOffer(offer.id, {
        operatorId: operator.id,
        actionType: DispatchActionType.PUBLISHED_API,
        channels: selectedChannels,
      });

      return {
        offerId: result.offerId,
        status: result.status,
        operatorName: result.operatorName,
        scheduledFor: result.scheduledFor,
        selectedChannels: result.selectedChannels,
      };
    });
  }

  /** Clique em "Copiar": copia para área de transferência e resolve a oferta. */
  function handleCopyAndDispatch(): void {
    void runResolution('copy', async () => {
      try {
        const { injectOperatorSubId, replaceUrlInCopy } = await import('@aap/shared');
        const trackedUrl = injectOperatorSubId(offer.affiliateUrl, operator.id);
        const copyWithSubId = replaceUrlInCopy(
          offer.aiCopy.messaging,
          offer.affiliateUrl,
          trackedUrl,
        );
        await navigator.clipboard.writeText(copyWithSubId);
      } catch (err) {
        throw new Error('Não foi possível copiar para a área de transferência.', { cause: err });
      }

      const result = await dispatchOffer(offer.id, {
        operatorId: operator.id,
        actionType: DispatchActionType.COPIED_CLIPBOARD,
        channels: selectedChannels,
      });

      return {
        offerId: result.offerId,
        status: result.status,
        operatorName: result.operatorName,
        scheduledFor: result.scheduledFor,
        selectedChannels: result.selectedChannels,
      };
    });
  }

  /** Clique em "Regenerar Copy": solicita nova variação ao LLM. */
  function handleRegenerate(): void {
    void runResolution('regenerate', async () => {
      // Regenerate does not transition the state of the board, it updates the card internally
      const updatedOffer = await regenerateCopy(offer.id);
      setOffer(updatedOffer);
    });
  }

  /** Clique em "Descartar": estado terminal, sem auditoria de disparo. */
  function handleDiscard(): void {
    void runResolution('discard', async () => {
      const result = await discardOffer(offer.id, { operatorId: operator.id });

      return {
        offerId: result.offerId,
        status: result.status,
        operatorName: result.operatorName,
        scheduledFor: result.scheduledFor,
        selectedChannels: result.selectedChannels,
      };
    });
  }

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-3">
          {imageFailed ? (
            <div
              className="rounded border d-flex align-items-center justify-content-center text-secondary text-center"
              style={{ width: 96, height: 96 }}
            >
              Sem imagem
            </div>
          ) : (
            <img
              src={offer.imageUrl}
              alt=""
              width={96}
              height={96}
              className="rounded border object-cover"
              onError={() => {
                setImageFailed(true);
              }}
            />
          )}

          <div className="flex-fill" style={{ minWidth: '16rem' }}>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <Badge tone="neutral">{offer.sourceName}</Badge>
              <span className="text-secondary">SKU {offer.externalSku}</span>
            </div>

            <h3 className="card-title mb-2">{offer.title}</h3>

            <PriceBlock offer={offer} />
          </div>
        </div>

        {offer.aiCopy.messaging ? (
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="form-label mb-0">Copy gerada pela IA</span>
              {isOpen ? (
                <Button
                  variant="secondary"
                  onClick={handleRegenerate}
                  loading={pending === 'regenerate'}
                  loadingLabel="Regenerando…"
                  disabled={pending !== null}
                >
                  Regenerar Copy
                </Button>
              ) : null}
            </div>
            {/* Uma variante por card: as outras são consumidas por canal, no
                driver de cada destino, e não pelo operador. */}
            <div className="border rounded p-2 bg-light whitespace-pre-wrap">
              {offer.aiCopy.messaging}
            </div>
          </div>
        ) : null}

        {isOpen ? (
          <div className="mt-3">
            <ChannelSelector
              channels={channels}
              selected={selectedChannels}
              onChange={handleSelectionChange}
              disabled={pending !== null}
            />
          </div>
        ) : (
          <ResolvedSummary offer={offer} channels={channels} />
        )}

        {error ? (
          <div className="mt-3">
            <Alert
              tone="danger"
              title="A ação não foi concluída"
              onDismiss={() => {
                setError(null);
              }}
            >
              {error}
            </Alert>
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className="card-footer d-flex flex-wrap gap-2">
          {!showDiscardConfirm ? (
            <>
              <Button
                variant="primary"
                onClick={handleDispatch}
                loading={pending === 'dispatch'}
                loadingLabel="Publicando…"
                disabled={pending !== null || selectedChannels.length === 0}
              >
                Publicar
              </Button>

              <Button
                variant="secondary"
                onClick={handleCopyAndDispatch}
                loading={pending === 'copy'}
                loadingLabel="Copiando…"
                disabled={pending !== null || selectedChannels.length === 0 || !offer.aiCopy.messaging}
              >
                Copiar para Área de Transferência
              </Button>

              <Button
                variant="danger"
                onClick={() => {
                  setShowDiscardConfirm(true);
                }}
                disabled={pending !== null}
              >
                Descartar
              </Button>

              {selectedChannels.length === 0 ? (
                <span className="text-secondary align-self-center">
                  Escolha ao menos um canal para publicar.
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="align-self-center fw-bold text-danger me-2">
                Tem certeza? O descarte é irreversível.
              </span>
              <Button
                variant="danger"
                onClick={handleDiscard}
                loading={pending === 'discard'}
                loadingLabel="Descartando…"
                disabled={pending !== null}
              >
                Confirmar Descarte
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDiscardConfirm(false);
                }}
                disabled={pending !== null}
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Resumo da oferta já resolvida: quem assinou, para onde vai e quando.
 *
 * Os canais são exibidos pelo rótulo, não pela chave: a chave é identificador de
 * payload e de auditoria, e não o nome pelo qual o operador conhece o destino. Um
 * canal removido do cadastro depois do disparo cai de volta na chave — é o único
 * nome que ainda resta dele.
 */
function ResolvedSummary({
  offer,
  channels,
}: {
  offer: OfferDto;
  channels: ChannelDto[];
}): React.JSX.Element {
  const labelByKey = new Map(channels.map((channel) => [channel.key, channel.label]));

  /**
   * Alvo da contagem regressiva, que pertence apenas à fila de disparo. Em
   * "Concluídas" o mesmo campo já é passado, e contar para trás um disparo
   * consumado não informa nada ao operador.
   */
  const countdownTarget = offer.status === OfferStatus.SCHEDULED ? offer.scheduledFor : null;

  return (
    <dl className="row mt-3 mb-0">
      <dt className="col-sm-3">Operador</dt>
      <dd className="col-sm-9">{offer.operatorName ?? '—'}</dd>

      <dt className="col-sm-3">Canais</dt>
      <dd className="col-sm-9">
        {offer.selectedChannels.length > 0
          ? offer.selectedChannels.map((key) => labelByKey.get(key) ?? key).join(', ')
          : '—'}
      </dd>

      <dt className="col-sm-3">
        {offer.status === OfferStatus.SCHEDULED ? 'Envio previsto' : 'Disparo'}
      </dt>
      <dd className="col-sm-9 mb-0 d-flex flex-wrap align-items-center gap-2">
        <span>{offer.scheduledFor ? formatDateTime(offer.scheduledFor) : '—'}</span>
        {countdownTarget ? <OfferCountdown scheduledFor={countdownTarget} /> : null}
      </dd>
    </dl>
  );
}
