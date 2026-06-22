#!/usr/bin/env bash

set -euo pipefail

ACT_ROOT="${ACT_ROOT:-/tmp/studentgo-act}"

mkdir -p \
  "$ACT_ROOT/actions" \
  "$ACT_ROOT/cache" \
  "$ACT_ROOT/artifacts"

exec act workflow_dispatch \
  --workflows .github/workflows/ci.yml \
  --action-cache-path "$ACT_ROOT/actions" \
  --cache-server-path "$ACT_ROOT/cache" \
  --artifact-server-path "$ACT_ROOT/artifacts" \
  --container-architecture linux/amd64 \
  --privileged \
  "$@"
