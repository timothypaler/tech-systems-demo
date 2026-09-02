#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chunk_root="${project_root}/.asset-chunks"

[[ -d "${chunk_root}" ]] || exit 0

while IFS= read -r first_chunk; do
  relative="${first_chunk#${chunk_root}/}"
  target="${project_root}/${relative%.chunk-000}"
  mkdir -p "$(dirname "${target}")"
  cat "${first_chunk%.chunk-000}".chunk-* > "${target}"
done < <(find "${chunk_root}" -type f -name '*.chunk-000' -print | sort)
