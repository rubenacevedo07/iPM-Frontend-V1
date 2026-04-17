#!/bin/bash
# Phase 3.3 ACTUAL FIX — remove premature buffer flush in init()
#
# Root cause found:
#   init() emits ENGINE.READY via _emitOrBuffer (correct — buffers if no handlers).
#   But immediately after, init() does:
#     this._pendingEvents.forEach(e => this._emit(e));
#     this._pendingEvents = [];
#   This tries to flush pending events, BUT:
#   - _handlers.length === 0 at this point, so _emit drops everything
#   - Then _pendingEvents = [] destroys the buffer
#   - When onEvent() runs later (in the XState action), the buffer is empty
#
#   Fix: remove these two lines. _emitOrBuffer + onEvent flush mechanism
#   already handles late-subscribing correctly.

set -e

echo "Removing premature buffer flush from GlobeBridge.init()..."

python3 - << 'PYEOF'
path = 'src/engine/GlobeBridge.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The two problematic lines that destroy the buffer before onEvent subscribes
old = """      this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
      this._pendingEvents.forEach(e => this._emit(e));
      this._pendingEvents = [];
      console.log('[DIAG] GlobeBridge init complete');"""

new = """      this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });
      // NOTE: Do NOT flush _pendingEvents here. Handlers are registered AFTER
      // init() returns (in EngineManager's createBridgeAndSubscribe action).
      // onEvent() flushes buffered events when a handler registers.
      console.log('[DIAG] GlobeBridge init complete');"""

if old not in content:
    print("ERROR: target lines not found. Current state around init():")
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'ENGINE.READY' in line or 'pendingEvents' in line:
            print(f"  line {i+1}: {line}")
    exit(1)

content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Premature buffer flush removed")

# Verify
with open(path, 'r', encoding='utf-8') as f:
    new_content = f.read()

# Count pendingEvents manipulations
push_count = new_content.count('this._pendingEvents.push')
assign_empty = new_content.count('this._pendingEvents = []')
forEach_count = new_content.count('this._pendingEvents.forEach')

print(f"\nVerification:")
print(f"  _pendingEvents.push    : {push_count}  (should be 1, in _emitOrBuffer)")
print(f"  _pendingEvents = []    : {assign_empty}  (should be 1, in onEvent after flush)")
print(f"  _pendingEvents.forEach : {forEach_count}  (should be 1, in onEvent flush loop)")

if push_count == 1 and assign_empty == 1 and forEach_count == 1:
    print("✅ All pendingEvents manipulations in expected locations")
else:
    print("⚠️  Unexpected count — manual verification recommended")
PYEOF

echo ""
echo "Next:"
echo "  rm -rf node_modules/.vite"
echo "  npm run dev"
echo "  Hard reload browser: Ctrl+Shift+R"
echo ""
echo "Expected logs:"
echo "  [DIAG] _emitOrBuffer: BUFFER path (no handlers yet)"
echo "  [DIAG] _emitOrBuffer: pending after push: 1"
echo "  [DIAG] GlobeBridge init complete"
echo "  [DIAG] bridge created, registering subscription"
echo "  [DIAG] onEvent called, pending events: 1          ← ← buffer preserved"
echo "  [DIAG] onEvent: flushing 1 buffered events"
echo "  [DIAG] onEvent: flushing event 0 : ENGINE.READY"
echo "  [DIAG] bridge event received in manager: ENGINE.READY  ← ← FIX WORKING"
echo "  [DIAG] engineManager state: {\"active\":\"idle\"}"
echo "  ← GLOBE VISIBLE"
