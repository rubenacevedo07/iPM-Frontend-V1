#!/bin/bash
# Micro-diagnostic: trace which branch _emitOrBuffer takes for ENGINE.READY
# Also trace pending events flush to see if handler receives them

set -e

echo "Patching _emitOrBuffer and onEvent with detailed DIAG logs..."

python3 - << 'PYEOF'
path = 'src/engine/GlobeBridge.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch _emitOrBuffer with branch logging
old_emit = """  private _emitOrBuffer(event: BridgeEvent): void {
    if (this._handlers.length > 0) this._emit(event);
    else this._pendingEvents.push(event);
  }"""

new_emit = """  private _emitOrBuffer(event: BridgeEvent): void {
    console.log('[DIAG] _emitOrBuffer called for:', event.type, 'handlers:', this._handlers.length, 'pending before:', this._pendingEvents.length);
    if (this._handlers.length > 0) {
      console.log('[DIAG] _emitOrBuffer: EMIT path (handlers exist)');
      this._emit(event);
    } else {
      console.log('[DIAG] _emitOrBuffer: BUFFER path (no handlers yet)');
      this._pendingEvents.push(event);
      console.log('[DIAG] _emitOrBuffer: pending after push:', this._pendingEvents.length);
    }
  }"""

if old_emit not in content:
    print("ERROR: _emitOrBuffer not found in expected form")
    exit(1)

content = content.replace(old_emit, new_emit, 1)

# 2. Patch onEvent with flush logging
old_onevent = """  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    this._handlers.push(handler);
    if (this._pendingEvents.length > 0) {
      this._pendingEvents.forEach(e => handler(e));
      this._pendingEvents = [];
    }
    return () => { this._handlers = this._handlers.filter(h => h !== handler); };
  }"""

new_onevent = """  onEvent(handler: (event: BridgeEvent) => void): Unsubscribe {
    console.log('[DIAG] onEvent called, pending events:', this._pendingEvents.length);
    this._handlers.push(handler);
    console.log('[DIAG] onEvent: handler pushed, handlers now:', this._handlers.length);
    if (this._pendingEvents.length > 0) {
      console.log('[DIAG] onEvent: flushing', this._pendingEvents.length, 'buffered events to new handler');
      this._pendingEvents.forEach((e, idx) => {
        console.log('[DIAG] onEvent: flushing event', idx, ':', e.type);
        handler(e);
        console.log('[DIAG] onEvent: handler returned for event', idx);
      });
      this._pendingEvents = [];
      console.log('[DIAG] onEvent: flush complete');
    } else {
      console.log('[DIAG] onEvent: no pending events to flush');
    }
    return () => { this._handlers = this._handlers.filter(h => h !== handler); };
  }"""

if old_onevent not in content:
    print("ERROR: onEvent not found in expected form")
    exit(1)

content = content.replace(old_onevent, new_onevent, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ _emitOrBuffer and onEvent patched with detailed DIAG logs")
PYEOF

echo ""
echo "Next: npm run dev, hard reload browser, paste full console output"
