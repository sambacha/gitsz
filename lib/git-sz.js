'use strict';

const path = require('path');

let GIT = process.env.GIT_SSH_COMMAND || process.env.GIT_SSH || 'git';

if (process.env.GIT_EXEC_PATH) {
  GIT = path.join(process.env.GIT_EXEC_PATH, 'git');
}

exports.GIT = GIT;
exports.common = require('./git-sz/common');
exports.Batch = require('./git-sz/batch');
exports.Hash = require('./git-sz/hash');
exports.LegacyHash = require('./git-sz/legacy-hash');
exports.API = require('./git-sz/api');
