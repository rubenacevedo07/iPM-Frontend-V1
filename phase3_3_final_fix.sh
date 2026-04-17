#!/bin/bash
# Phase 3.3 FINAL FIX — ENGINE.READY must use _emitOrBuffer (not _emit)
# 
# Root cause:
#   async init() with no awaits runs synchronously until ENGINE.READY emit.
#   That happens INSIDE createEngine() call, before onEvent() registers handler.
#   _emit() drops the event because handlers.length === 0.
#   Fix: route ENGINE.READY through _emitOrBuffer like other events.

set -e

echo "Patching GlobeBridge.ts — ENGINE.READY now uses _emitOrBuffer..."

# Replace the direct _emit call for ENGINE.READY with _emitOrBuffer
# Also update the comment nearby

python3 - << 'PYEOF'
import re

path = 'src/engine/GlobeBridge.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact line we need to replace
old = "this._emit({ type: 'ENGINE.READY', engineId: 'globe' });"
new = "this._emitOrBuffer({ type: 'ENGINE.READY', engineId: 'globe' });"

if old not in content:
    print("ERROR: target line not found. Current state:")
    for i, line in enumerate(content.split('\n'), 1):
        if 'ENGINE.READY' in line:
            print(f"  line {i}: {line}")
    exit(1)

content = content.replace(old, new, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ GlobeBridge.ts patched")

# Verify
with open(path, 'r', encoding='utf-8') as f:
    new_content = f.read()

if new in new_content and old not in new_content:
    print("✅ Verification: _emitOrBuffer is in place, _emit for ENGINE.READY removed")
else:
    print("⚠️  Verification failed")
    exit(1)
PYEOF

echo ""
echo "Next steps:"
echo "  1. rm -rf node_modules/.vite"
echo "  2. npm run dev"
echo "  3. Hard reload browser: Ctrl+Shift+R"
echo ""
echo "Expected new log sequence:"
echo "  [DIAG] createBridgeAndSubscribe called"
echo "  [DIAG] creating engine: globe"
echo "  [DIAG] GlobeBridge constructor called"
echo "  [DIAG] GlobeBridge.init() start"
echo "  [DIAG] emitting ENGINE.READY, handlers count: 0     ← still 0, but now buffered"
echo "  [DIAG] GlobeBridge init complete"
echo "  [DIAG] bridge created, registering subscription"
echo "  [DIAG] subscription active, handlers registered     ← buffer flushed here"
echo "  [DIAG] bridge event received in manager: ENGINE.READY  ← ← ← FIX WORKING"
echo "  [DIAG] engineManager state: {\"active\":\"idle\"}         ← ← ← transition OK"
echo "  ← GLOBE VISIBLE"
