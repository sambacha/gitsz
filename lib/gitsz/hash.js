'use strict';
var assert = require('assert');
var path = require('path');
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
var async = require('async');
var gst = require('../gitsz');
function Hash(options) {
    this.options = options || {};
}
module.exports = Hash;
function State(digest, root, dir, batch) {
    this.digest = digest;
    this.root = root;
    this.dir = dir;
    this.batch = batch;
}
State.prototype.query = function query(hash) {
    return this.batch.query(hash);
};
State.prototype.update = function update(data) {
    this.digest.update(data);
};
State.prototype.enter = function enter(part) {
    var subdir = this.dir === '' ? part : this.dir + '/' + part;
    return new State(this.digest, this.root, subdir, this.batch);
};
Hash.prototype._visit = function _visit(state, hash, callback) {
    var _this = this;
    var stream = state.query(hash);
    stream.on('header', function (type, size) {
        if (type !== 'tag')
            state.update(type + ' ' + size + '\0');
        var chunks = [];
        stream.on('data', function (data) {
            if (type !== 'tag')
                state.update(data);
            if (type === 'blob')
                return;
            chunks.push(data);
        });
        stream.on('end', function () {
            if (type === 'blob')
                return callback(null);
            var content = Buffer.concat(chunks);
            if (type === 'tree')
                _this._visitTree(state, content, callback);
            else if (type === 'commit') {
                _this._visitCommit(state, hash, content, callback);
            }
            else if (type === 'tag')
                _this._visitTag(state, hash, content, callback);
            else
                throw new Error("Unexpected type " + type);
        });
    });
    stream.on('error', function (err) { return callback(err); });
};
Hash.prototype._visitTree = function _visitTree(state, content, callback) {
    var _this = this;
    var tree = gst.common.parseTree(content);
    async.forEachSeries(tree, function (node, callback) {
        var subState = state.enter(node.name);
        if (node.mode === '160000') {
            return _this._visitSubmodule(subState, node.hash, callback);
        }
        _this._visit(subState, node.hash, callback);
    }, function (err) {
        if (err && !/while loading/.test(err.message)) {
            err.message += "\nwhile loading tree at " + (state.dir || '.');
        }
        callback(err);
    });
};
Hash.prototype._visitCommit = function _visitCommit(state, hash, content, callback) {
    content = content.toString();
    // Root commit
    assert.strictEqual(state.dir, '', 'Unexpected commit in a tree!');
    var match = content.match(/(?:^|[\r\n])tree ([a-z0-9]{40})/);
    assert(match !== null, 'Commit without `tree`');
    this._visit(state, match[1], function (err) {
        if (err && !/while loading/.test(err.message)) {
            err.message += "\nwhile loading commit " + hash;
        }
        callback(err);
    });
};
Hash.prototype._visitTag = function _visitTag(state, ref, content, callback) {
    content = content.toString();
    var match = content.match(/(?:^|[\r\n])object ([a-z0-9]{40})/);
    assert(match !== null, 'Tag without `object`');
    this._visit(state, match[1], function (err) {
        if (err && !/while loading/.test(err.message)) {
            err.message += "\nwhile loading tag " + ref;
        }
        callback(err);
    });
};
Hash.prototype._visitSubmodule = function _visitSubmodule(state, hash, callback) {
    // TODO(sambacha): windows-style paths?
    var moduleRoot = path.join(state.root, state.dir);
    var batch = new gst.Batch(moduleRoot);
    var moduleState = new State(state.digest, moduleRoot, '', batch);
    this._visit(moduleState, hash, function (err) {
        if (err && !/while loading/.test(err.message)) {
            err.message +=
                '\nwhile loading submodule at ' +
                    ("" + path.relative(state.root, moduleRoot));
        }
        batch.destroy();
        callback(err);
    });
};
Hash.prototype.calculate = function calculate(dir, hash, callback) {
    var digest = crypto.createHash('sha512');
    var batch = new gst.Batch(dir);
    var state = new State(digest, dir, '', batch);
    this._visit(state, hash || 'HEAD', function (err) {
        batch.destroy();
        if (err)
            return callback(err);
        callback(null, digest.digest('hex'));
    });
};
