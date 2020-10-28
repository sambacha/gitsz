'use strict';

const path = require('path');

let GIT = process.env.GIT_SSH_COMMAND || process.env.GIT_SSH || 'git';

if (process.env.GIT_EXEC_PATH) {
  GIT = path.join(process.env.GIT_EXEC_PATH, 'git');
}

exports.GIT = GIT;
exports.common = require('./gitsz/common');
exports.Batch = require('./gitsz/batch');
exports.Hash = require('./gitsz/hash');
exports.LegacyHash = require('./gitsz/legacy-hash');
exports.API = require('./gitsz/api');
