#!/bin/sh
export CODECOV_TOKEN="23544ffd-233e-4f44-9482-2d948de67155"
./node_modules/.bin/nyc tape test/api-test.js
#./node_modules/.bin/nyc tape test/ev-tag-test.js
#./node_modules/.bin/nyc tape test/scenario-test.js
./node_modules/.bin/nyc report --reporter=text-lcov | coveralls