#!/bin/sh
# Small Hours: bundle _dev/src into assets/app.js (three.js tree-shaken, minified).
# Needs node + npm. First time: (cd _dev && npm install)
set -e
cd "$(dirname "$0")"
npx esbuild src/main.js --bundle --format=esm --minify --target=es2020 --legal-comments=none --outfile=../assets/app.js
# the page revalidates but assets/* is cached for a day: stamp the script URL with its hash so a new build is never paired with an old script
h=$(md5sum ../assets/app.js | cut -c1-8)
sed -i -E "s#assets/app\.js(\?v=[0-9a-f]+)?#assets/app.js?v=$h#g" ../index.html
