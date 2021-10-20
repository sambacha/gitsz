'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const rimraf = require('rimraf');

const gst = require('../../');
const GIT = gst.GIT;

const cli = path.join(__dirname, '..', '..', 'bin', 'gitsz');
exports.cli = cli;

const repo = path.join(__dirname, 'repo');
exports.repo = repo;

function cmd(name, args, noCwd) {
  const p = spawnSync(name, args, {
    stdio: [null, 'pipe', 'pipe'],
    cwd: noCwd ? undefined : repo,
  });
  if (p.status !== 0) {
    const msg = `${name} ${args.join(' ')} failed`;
    throw new Error(msg + '\n' + p.stdout + '\n' + p.stderr);
  }
  return p.stdout.toString();
}
exports.cmd = cmd;

function write(file, content) {
  fs.writeFileSync(path.join(repo, file), content);
}
exports.write = write;

exports.tags = function tags() {
  const lines = cmd(GIT, ['tag', '-n9999']).split('\n');

  const result = [];

  let tag;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line)) {
      tag = line.split(/\s/)[0];
      continue;
    }

    if (/Git-(EVTag-v0-SHA512|Secure-Tag-V0)/.test(line)) result.push(tag);
  }

  return result;
};

// Initialize repo
exports.init = function init() {
  rimraf.sync(repo);
  fs.mkdirSync(repo);

  cmd(GIT, ['init']);
  cmd(GIT, ['config', 'user.email', 'john@doe.org']);
  cmd(GIT, ['config', 'user.name', 'John Doe']);

  write('file.txt', 'hello');
  cmd(GIT, ['add', 'file.txt']);
  cmd(GIT, ['commit', '-m', 'first']);

  write('file.txt', 'world');
  cmd(GIT, ['add', 'file.txt']);
  cmd(GIT, ['commit', '-m', 'second']);

  write('file.txt', '!');
  cmd(GIT, ['add', 'file.txt']);
  cmd(GIT, ['commit', '-m', 'third']);

  // Create invalid tags
  const hash = crypto.createHash('sha512').update('invalid').digest('hex');
  cmd(GIT, ['tag', '-m', `Git-EVTag-v0-SHA512: ${hash}`, 'invalid-1']);
  cmd(GIT, ['tag', '-m', `Git-Secure-Tag-v0: ${hash}`, 'invalid-2']);
  cmd(GIT, ['tag', '-m', `Random-Hash: ${hash}`, 'invalid-3']);
};

// Clone repo
exports.clone = function clone(url) {
  rimraf.sync(repo);
  cmd(GIT, ['clone', '--recursive', url, repo], true);
};

exports.destroy = function destroy() {
  rimraf.sync(repo);
};
