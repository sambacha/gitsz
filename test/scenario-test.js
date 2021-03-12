'use strict';
var tape = require('tape');
var fixtures = require('./fixtures');
var cli = fixtures.cli;
var cmd = fixtures.cmd;
tape('git secure tag', function (t) {
    fixtures.init();
    // Create tags
    var node = process.execPath;
    cmd(node, [cli, '--insecure', 'tag-latest']);
    cmd(node, [cli, '--insecure', 'tag-middle', 'HEAD^']);
    cmd(node, [cli, '--insecure', '--legacy', 'tag-legacy', 'HEAD^^']);
    // Verify tags
    t.doesNotThrow(function () { return cmd(node, [cli, '--insecure', '-v', 'tag-latest']); }, 'valid HEAD evtag');
    t.doesNotThrow(function () { return cmd(node, [cli, '--insecure', '-v', 'tag-middle']); }, 'valid non-HEAD evtag');
    t.doesNotThrow(function () { return cmd(node, [cli, '--insecure', '-v', 'tag-legacy']); }, 'valid legacy hash');
    // Fail to verify invalid tags
    t.throws(function () { return cmd(node, [cli, '--insecure', '-v', 'invalid-1']); }, /EVTag.*mismatch/, 'invalid evtag hash');
    t.throws(function () { return cmd(node, [cli, '--insecure', '-v', 'invalid-2']); }, /Secure-Tag.*mismatch/, 'invalid legacy hash');
    t.throws(function () { return cmd(node, [cli, '--insecure', '-v', 'invalid-3']); }, /No.*found/, 'no hash at all');
    fixtures.destroy();
    t.end();
});
