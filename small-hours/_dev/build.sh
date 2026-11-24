#!/bin/sh
# Small Hours: bundle _dev/src into assets/app.js (three.js tree-shaken, minified).
# Needs node + npm. First time: (cd _dev && npm install)
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --format=esm --minify --target=es2020 --legal-comments=none --outfile=../assets/app.js
