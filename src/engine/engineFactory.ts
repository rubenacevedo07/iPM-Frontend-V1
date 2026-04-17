// src/engine/engineFactory.ts
// Sync factory — returns bridge in `pending`, async init runs behind ENGINE.READY (Rule 4, Rule 5)

import type { EngineId, EngineInitInput } from './contracts/inputs';
import type { IEngineBridge, BridgeEvent, BridgeCommand, Unsubscribe } from './contracts/bridge';

// ---------------------------------------------------------------------------
// Base bridge implementation — shared by all engine stubs
// ---------------------------------------------------------------------------

class BaseBridge implements IEngineBridge {
  readonly engineId: EngineId;
  private _status: IEngineBridge['status'] = 'pending';
  private _handlers: Array<(event: BridgeEvent) => void> = [];

  constructor(engineId: EngineId) {
    this.engineId = engineId;
  }

  get status(): IEngineBridge['status'] {
    return this._status;
  }

  /**
   * Send a command down to the engine.
   * Commands sent when status !== 'ready' are silently dropped.
   */
  send(_command: BridgeCommand): void {
    if (this._status !== 'ready') return;
    // Concrete bridge overrides this to forward to engine
  }

  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    return () => {
      this._handlers = this._handlers.filter(h => h !== handler);
    };
  }

  protected emit(event: BridgeEvent): void {
    this._handlers.forEach(h => h(event));
  }

  protected setStatus(next: IEngineBridge['status']): void {
    this._status = next;
  }
}

// ---------------------------------------------------------------------------
// Engine stubs
// ---------------------------------------------------------------------------

class GlobeBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('globe');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // TODO Phase 3: replace with real DeckGL imperative init (new Deck({...}), deck.setProps())
      await Promise.resolve();
      input.container.dataset.engine = 'globe';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'globe' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'globe', error: error as Error });
    }
  }
}

class NetworkBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('network');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'network';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'network' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'network', error: error as Error });
    }
  }
}

class ForceBridge extends BaseBridge {
  constructor(input: EngineInitInput) {
    super('force');
    this._init(input);
  }

  private async _init(input: EngineInitInput): Promise<void> {
    try {
      // STUB: kept for EngineManager testing. Real impl in Phase 4+
      await Promise.resolve();
      input.container.dataset.engine = 'force';
      this.setStatus('ready');
      this.emit({ type: 'ENGINE.READY', engineId: 'force' });
    } catch (error) {
      this.setStatus('failed');
      this.emit({ type: 'ENGINE.ERROR', engineId: 'force', error: error as Error });
    }
  }
}

// ---------------------------------------------------------------------------
// Registry + factory function
// ---------------------------------------------------------------------------

const engines: Record<EngineId, (input: EngineInitInput) => IEngineBridge> = {
  globe:   (input) => new GlobeBridge(input),
  network: (input) => new NetworkBridge(input),
  force:   (input) => new ForceBridge(input),
};

/**
 * Sync factory — returns bridge immediately in `pending` status.
 * Listen for ENGINE.READY before sending commands.
 */
export function createEngine(engineId: EngineId, input: EngineInitInput): IEngineBridge {
  const factory = engines[engineId];
  if (!factory) throw new Error(`Unknown engineId: ${engineId}`);
  return factory(input);
}
