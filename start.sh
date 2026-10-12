#!/bin/bash
cd "$(dirname "$0")"
exec python3 server.py --no-browser --host 0.0.0.0 --port "${PORT:-8077}"
