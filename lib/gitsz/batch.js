"use strict";
var stream = require('stream');
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'spawn'.
var spawn = require('child_process').spawn;
// @ts-expect-error ts-migrate(2451) FIXME: Cannot redeclare block-scoped variable 'gst'.
var gst = require('../gitsz');
// @ts-expect-error ts-migrate(2300) FIXME: Duplicate identifier 'this'.
function Batch(dir) {
    var _this = this;
    // @ts-expect-error ts-migrate(2300) FIXME: Duplicate identifier 'this'.
    this.dir = dir;
    // @ts-expect-error ts-migrate(2300) FIXME: Duplicate identifier 'this'.
    // TODO(indutny): symlinks?
    // @ts-expect-error ts-migrate(2300) FIXME: Duplicate identifier 'this'.
    this.proc = spawn(gst.GIT, ['cat-file', '--batch'], {
        // @ts-expect-error ts-migrate(2300) FIXME: Duplicate identifier 'this'.
        stdio: ['pipe', 'pipe', null],
        cwd: this.dir,
    });
    this.proc.on('exit', function (code) { return _this.onExit(code); });
    this.proc.stdout.on('data', function (data) { return _this.onData(data); });
    this.queue = [];
    this.state = 'header';
    this.header = '';
    this.body = null;
}
module.exports = Batch;
Batch.prototype.destroy = function destroy() {
    this.proc.kill();
};
Batch.prototype.onExit = function onExit(code) {
    var err = new Error("git cat-file --batch (cwd: " + this.dir + ") exit " + code);
    var q = this.queue;
    this.queue = null;
    q.forEach(function (entry) {
        entry.stream.emit('error', err);
    });
};
Batch.prototype.onData = function onData(data) {
    while (data.length !== 0) {
        if (this.state === 'header') {
            var i = void 0;
            for (i = 0; i < data.length; i++)
                if (data[i] === 0x0a /* '\n' */)
                    break;
            this.header += data.slice(0, i);
            if (i === data.length)
                break;
            // Skip '\n'
            data = data.slice(i + 1);
            var header = this.header;
            this.header = '';
            this.onHeader(header);
            continue;
        }
        else if (this.state === 'body' && data.length !== 0) {
            data = this.onBody(data);
            continue;
        }
        else if (this.state === 'body-end' && data.length !== 0) {
            // Skip '\n'
            data = data.slice(1);
            this.state = 'header';
            continue;
        }
    }
};
Batch.prototype.onHeader = function onHeader(header) {
    var parts = header.split(/\s/g);
    if (parts[1] === 'missing')
        this.onMissing(parts[0]);
    else if (/^[a-z0-9]{40}$/.test(parts[0]))
        this.onEntry(parts[0], parts[1], parts[2]);
    else
        throw new Error("Unexpected header " + header);
};
Batch.prototype.getEntry = function getEntry(object) {
    var entry = this.queue[0];
    if (!entry)
        throw new Error("Unexpected reply for " + object);
    return entry;
};
Batch.prototype.onMissing = function onMissing(object) {
    var entry = this.getEntry(object);
    this.queue.shift();
    entry.stream.emit('error', new Error("missing " + object));
};
Batch.prototype.onEntry = function onEntry(object, type, size) {
    var entry = this.getEntry(object);
    entry.stream.emit('header', type, size);
    this.state = 'body';
    // floats store 52 bits of integer precision
    this.waiting = parseFloat(size);
};
Batch.prototype.onBody = function onBody(chunk) {
    var entry = this.queue[0];
    var rest = chunk.slice(this.waiting);
    entry.stream.push(chunk.slice(0, this.waiting));
    this.waiting -= chunk.length;
    if (this.waiting > 0)
        return rest;
    this.state = 'body-end';
    this.waiting = 0;
    this.queue.shift();
    entry.stream.push(null);
    return rest;
};
Batch.prototype.query = function query(object) {
    var out = new stream.PassThrough();
    this.queue.push({ object: object, stream: out });
    this.proc.stdin.write(object + "\n");
    return out;
};