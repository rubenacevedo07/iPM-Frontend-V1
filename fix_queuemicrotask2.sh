#!/bin/bash
set -e

python3 - << 'PYEOF'
with open('src/engine/GlobeBridge.ts', 'r') as f:
    content = f.read()

old = """      this._status = 'ready';
      console.log('[DIAG] emitting ENGINE.READY, handlers count:', this._handlers.length);
      this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
      this._pendingEvents.forEach(e => this._emit(e));
      this._pendingEvents = [];
      console.log('[DIAG] GlobeBridge init complete');"""

new = """      this._status = 'ready';
      // Defer ENGINE.READY to next microtask — guarantees XState entry action
      // (subscribeBridge) registers handler before emit fires.
      queueMicrotask(() => {
        console.log('[DIAG] emitting ENGINE.READY (microtask), handlers count:', this._handlers.length);
        this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
        this._pendingEvents.forEach(e => this._emit(e));
        this._pendingEvents = [];
        console.log('[DIAG] GlobeBridge init complete');
      });"""

if old in content:
    result = content.replace(old, new)
    with open('src/engine/GlobeBridge.ts', 'w') as f:
        f.write(result)
    print('✅ queueMicrotask applied')
else:
    print('❌ block not found, printing lines 85-95:')
    for i, l in enumerate(content.split('\n')[84:95], 85):
        print(f'{i}: {repr(l)}')
PYEOF
