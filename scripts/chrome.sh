#!/bin/bash
export LD_LIBRARY_PATH="$HOME/miniconda3/lib:${LD_LIBRARY_PATH:-}"
exec "$(find "$HOME/.cache/puppeteer" -name chrome -type f 2>/dev/null | head -1)" "$@"
