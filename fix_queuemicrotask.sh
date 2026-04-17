#!/bin/bash
# Fix Pattern E (final) — defer ENGINE.READY with queueMicrotask
# Architectural fix: GlobeBridge never emits synchronously during construction.
# queueMicrotask defers past current sync stack, before any setTimeout.

set -e

python3 - << 'PYEOF'
with open('src/engine/GlobeBridge.ts', 'r') as f:
    content = f.read()

# Find the ready + emit block (with or without DIAG logs)
import re

# Replace the status=ready + emit block with deferred version
old_pattern = r"      this\._status = 'ready';\n.*?console\.log\('[DIAG].*?'\);\n      this\._emit\(\{ type: 'ENGINE\.READY', engineId: 'globe' \}\);\n      this\._pendingEvents\.forEach\(e => this\._emit\(e\)\);\n      this\._pendingEvents = \[\];\n.*?console\.log\('[DIAG].*?'\);"

new_block = """      this._status = 'ready';
      // Defer ENGINE.READY to next microtask — guarantees XState entry action
      // (subscribeBridge) registers handler before emit fires.
      // queueMicrotask runs after current sync stack, before setTimeout.
      queueMicrotask(() => {
        console.log('[DIAG] emitting ENGINE.READY (microtask), handlers count:', this._handlers.length);
        this._emit({ type: 'ENGINE.READY', engineId: 'globe' });
        this._pendingEvents.forEach(e => this._emit(e));
        this._pendingEvents = [];
        console.log('[DIAG] GlobeBridge init complete');
      });"""

result = re.sub(old_pattern, new_block, content, flags=re.DOTALL)

if result == content:
    # Try simpler replacement without DIAG logs
    old_simple = """      this._status = 'ready';
      console.log('[DIAG] emitting ENGINE.READY, handlers count:', this._handlers.length);
      this._emit({ type: 'ENGINE.READY', engineId: 'globe' });
      this._pendingEvents.forEach(e => this._emit(e));
      this._pendingEvents = [];
      console.log('[DIAG] GlobeBridge init complete');"""
    
    new_simple = """      this._status = 'ready';
      // Defer ENGINE.READY to next microtask — guarantees XState entry action
      // (subscribeBridge) registers handler before emit fires.
      queueMicrotask(() => {
        console.log('[DIAG] emitting ENGINE.READY (microtask), handlers count:', this._handlers.length);
        this._emit({ type: 'ENGINE.READY', engineId: 'globe' });
        this._pendingEvents.forEach(e => this._emit(e));
        this._pendingEvents = [];
        console.log('[DIAG] GlobeBridge init complete');
      });"""
    
    if old_simple in content:
        result = content.replace(old_simple, new_simple)
        print('✅ ENGINE.READY deferred with queueMicrotask')
    else:
        print('❌ Could not find emit block. Printing relevant section:')
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'ENGINE.READY' in line or 'ready' in line.lower():
                print(f'{i}: {line}')
        import sys; sys.exit(1)
else:
    print('✅ ENGINE.READY deferred with queueMicrotask (regex match)')

with open('src/engine/GlobeBridge.ts', 'w') as f:
    f.write(result)
PYEOF
