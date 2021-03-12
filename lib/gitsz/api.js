'use strict';
var spawn = require('child_process').spawn;
var async = require('async');
var gst = require('../gitsz');
function API(dir) {
    this.dir = dir;
}
module.exports = API;
var TAG_RE = /(?:[\r\n]|^)Git-(EVTag-v0-SHA512|Secure-Tag-V0)\s*:\s*([^\r\n]*)([\r\n]|$)/i;
function buffer(stream) {
    var chunks = '';
    var done = false;
    stream.on('data', function (chunk) { return (chunks += chunk); });
    stream.on('end', function () { return (done = true); });
    return function (callback) {
        if (done)
            return callback(null, chunks);
        else
            stream.once('end', function () { return callback(null, chunks); });
    };
}
function git(args, stdio, cwd, env, callback) {
    var p = spawn(gst.GIT, args, {
        stdio: stdio,
        cwd: cwd,
        env: env,
    });
    var stdout = p.stdout ? buffer(p.stdout) : function (cb) { return cb(null, null); };
    var stderr = p.stderr ? buffer(p.stderr) : function (cb) { return cb(null, null); };
    async.parallel({
        status: function (callback) {
            p.on('exit', function (status) { return callback(null, status); });
        },
        stdout: stdout,
        stderr: stderr,
    }, callback);
}
API.prototype.verify = function verify(tag, options, callback) {
    var _this = this;
    if (!options)
        options = {};
    var args = options.insecure ? ['show', tag] : ['verify-tag', '-v', tag];
    async.waterfall([
        function (callback) {
            git(args, ['inherit', 'pipe', 'pipe'], _this.dir, options.env, callback);
        },
        function (p, callback) {
            if (p.status !== 0) {
                if (callback)
                    return callback(new Error(p.stderr.toString()), false);
                process.stdout.write(p.stdout.toString());
                process.stderr.write(p.stderr.toString());
                process.exit(1);
                return;
            }
            var stdout = p.stdout.toString();
            var match = stdout.match(TAG_RE);
            if (match === null) {
                var msg = 'error: No `Git-EVTag-v0-SHA512: ...`, nor ' +
                    '`Git-Secure-Tag-V0` found in tag description';
                if (callback)
                    return callback(new Error(msg), false);
                process.stderr.write(msg + '\n');
                process.exit(1);
                return;
            }
            var isLegacy = match[1].toLowerCase() === 'secure-tag-v0';
            var hash = new (isLegacy ? gst.LegacyHash : gst.Hash)(options);
            hash.calculate(_this.dir, tag, function (err, out) {
                return callback(err, out, match, p);
            });
        },
        function (hash, match, p, callback) {
            if (hash === match[2]) {
                callback(null, match[1], p.stderr.toString());
                return;
            }
            var msg = "error: Git-" + match[1] + " hash mismatch\n" +
                ("error: Expected: " + hash + "\n") +
                ("error: Found: " + match[2]);
            callback(new Error(msg), false);
        },
    ], function (err, type, stderr) {
        if (err) {
            if (callback)
                return callback(err, false);
            process.stderr.write('error: ' + err.stack + '\n');
            process.exit(1);
            return;
        }
        if (callback)
            return callback(null, true);
        process.stderr.write(stderr);
        process.stderr.write("Good Git-" + type + " hash\n");
        process.exit(0);
    });
};
API.prototype.sign = function sign(tag, ref, options, callback) {
    var _this = this;
    // TODO(sambacha): support multiple refs?
    if (!options)
        options = {};
    async.waterfall([
        function (callback) {
            var hash = new (options.legacy ? gst.LegacyHash : gst.Hash)(options);
            hash.calculate(_this.dir, ref, callback);
        },
        function (hash, callback) {
            var name = options.legacy
                ? 'Git-Secure-Tag-V0'
                : 'Git-EVTag-v0-SHA512';
            var msg = (options.m || tag + '\n') + '\n' + (name + ": " + hash + "\n");
            var args = ['tag'];
            args.push('-m', msg);
            if (options.u)
                args.push('-u', options.u);
            else if (!options.insecure)
                args.push('-s');
            if (options.f)
                args.push('-f');
            args.push(tag);
            if (ref !== undefined)
                args.push(ref);
            git(args, 'inherit', _this.dir, options.env, callback);
        },
        function (proc, callback) {
            callback(proc.status === 0 ? null : new Error('git failure'));
        },
    ], function (err) {
        if (err) {
            if (callback)
                return callback(err);
            process.stderr.write(err.stack + '\n');
            process.exit(1);
            return;
        }
        if (callback)
            return callback(null);
        process.exit(0);
    });
};
