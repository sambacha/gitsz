'use strict';
var assert = require('assert');
var path = require('path');
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
var async = require('async');
var gst = require('../gitsz');
function Hash(options) {
    this.options = options || {};
    this.cwd = null;
}
module.exports = Hash;
function compareEntries(a, b) {
    return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
}
Hash.prototype.hashBlob = function hashBlob(batch, blob, callback) {
    var hash = crypto.createHash('sha512');
    var stream = batch.query(blob);
    stream.pipe(hash);
    stream.on('error', function (err) { return callback(err); });
    var content = [];
    hash.on('data', function (chunk) { return content.push(chunk); });
    hash.on('end', function () {
        content = Buffer.concat(content);
        callback(null, content.toString('hex'));
    });
};
Hash.prototype.hashSubmodule = function hashSubmodule(dir, ref, callback) {
    var hash = new Hash(this.options);
    hash._calculate(ref, dir, path.join(this.cwd, dir), callback);
};
Hash.prototype.flattenTree = function flattenTree(batch, dir, tree, callback) {
    var _this = this;
    var stream = batch.query(tree);
    var content = [];
    stream.on('data', function (chunk) { return content.push(chunk); });
    stream.on('error', function (err) { return callback(err); });
    var recurse = function (entry, callback) {
        var fullPath = dir === '' ? entry.name : dir + '/' + entry.name;
        function next(err, content) {
            entry.content = content;
            callback(err, entry);
        }
        if (entry.mode === '40000') {
            return _this.flattenTree(batch, fullPath, entry.hash, next);
        }
        else if (entry.mode === '160000') {
            return _this.hashSubmodule(fullPath, entry.hash, next);
        }
        return _this.hashBlob(batch, entry.hash, next);
    };
    stream.on('end', function () {
        content = Buffer.concat(content);
        content = gst.common.parseTree(content);
        content.sort(compareEntries);
        async.map(content, recurse, callback);
    });
};
Hash.prototype.digest = function digest(hash, line) {
    hash.update(line + '\n');
    if (this.options.verbose)
        process.stdout.write(line + '\n');
};
Hash.prototype.hashTree = function hashTree(tree, digest) {
    var _this = this;
    tree.forEach(function (entry) {
        var line = entry.mode + ' ' + entry.name + ' ' + entry.hash;
        if (Array.isArray(entry.content)) {
            _this.digest(digest, line + ' ' + entry.content.length);
            _this.hashTree(entry.content, digest);
        }
        else {
            _this.digest(digest, line + ' ' + entry.content);
        }
    });
};
Hash.prototype.getTree = function getTree(batch, ref, callback) {
    var _this = this;
    var stream = batch.query(ref);
    stream.on('header', function (type) {
        var content = '';
        stream.on('data', function (chunk) { return (content += chunk); });
        stream.once('end', function () {
            if (type === 'tag') {
                var match_1 = content.match(/(?:^|[\r\n])object ([a-z0-9]{40})/);
                assert(match_1 !== null, 'Tag without `object`');
                return _this.getTree(batch, match_1[1], callback);
            }
            assert.strictEqual(type, 'commit');
            var match = content.match(/(?:^|[\r\n])tree ([a-z0-9]{40})/);
            assert(match !== null, 'Commit without `tree`');
            return callback(null, match[1]);
        });
    });
};
Hash.prototype._calculate = function _calculate(hash, relative, dir, callback) {
    var _this = this;
    var digest = crypto.createHash('sha512');
    var batch = new gst.Batch(dir);
    this.cwd = dir;
    // `update-index`?
    async.waterfall([
        function (callback) {
            _this.getTree(batch, hash || 'HEAD', callback);
        },
        function (hash, callback) {
            _this.flattenTree(batch, relative, hash, function (err, tree) {
                return callback(err, tree, hash);
            });
        },
    ], function (err, tree, hash) {
        if (err)
            return callback(err);
        batch.destroy();
        _this.digest(digest, 'write-tree ' + hash + ' ' + tree.length);
        _this.hashTree(tree, digest);
        callback(null, digest.digest('hex'));
    });
};
Hash.prototype.calculate = function calculate(dir, hash, callback) {
    this._calculate(hash, '', dir, callback);
};
