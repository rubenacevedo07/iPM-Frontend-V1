#!/bin/bash
set -e

python3 - << 'PYEOF'
with open('src/engine/GlobeBridge.ts', 'r') as f:
    content = f.read()

old = """      this._status = 'ready';
      console.log('[DIAG] emitting ENGINE.READY, handlers count:', this._handlers.length);
      this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
      // NOTE: Do NOT flush _pendingEvents here. Handlers are registered AFTER
      // init() returns (in EngineManager's createBridgeAndSubscribe action).
      // onEvent() flushes buffered events when a handler registers.
      console.log('[DIAG] GlobeBridge init complete');"""

new = """      this._status = 'ready';
      // Defer ENGINE.READY to next microtask — guarantees XState entry action
      // registers handler before emit fires.
      queueMicrotask(() => {
        console.log('[DIAG] emitting ENGINE.READY (microtask), handlers count:', this._handlers.length);
        this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
        console.log('[DIAG] GlobeBridge init complete');
      });"""

if old in content:
    result = content.replace(old, new)
    with open('src/engine/GlobeBridge.ts', 'w') as f:
        f.write(result)
    print('✅ queueMicrotask applied')
else:
    print('❌ still not found')
    import sys; sys.exit(1)
PYEOF
