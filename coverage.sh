#!/bin/sh
./node_modules/.bin/nyc tape test/api-test.js
./node_modules/.bin/nyc tape test/ev-tag-test.js
./node_modules/.bin/nyc tape test/scenario-test.js
./node_modules/.bin/nyc report --reporter=text-lcov | coveralls