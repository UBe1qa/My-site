#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p public/stockfish
cp node_modules/stockfish/bin/stockfish-19-lite-single.js public/stockfish/
cp node_modules/stockfish/bin/stockfish-19-lite-single.wasm public/stockfish/

npm test
npm run build

# Sync built static output into movelens/ root for GitHub Actions wrangler deploy
rm -rf ../assets ../stockfish
cp -R dist/* ../
echo "Synced dist/ to movelens/ root."
