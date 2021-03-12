'use strict';
var async = require('async');
var tape = require('tape');
var gst = require('../');
var fixtures = require('./fixtures');
tape('js api', function (t) {
    fixtures.init();
    // Verify tags
    var api = new gst.API(fixtures.repo);
    var tags = [
        { name: 'tag-latest', ref: 'HEAD' },
        { name: 'tag-middle', ref: 'HEAD^' },
        { name: 'tag-first', ref: 'HEAD^^', legacy: true },
    ];
    async.waterfall([
        function (callback) {
            async.forEachSeries(tags, function (tag, callback) {
                api.sign(tag.name, tag.ref, { legacy: tag.legacy, insecure: true }, callback);
            }, callback);
        },
        function (callback) {
            async.mapSeries(tags, function (tag, callback) {
                api.verify(tag.name, { insecure: true }, callback);
            }, callback);
        },
        function (results, callback) {
            t.deepEqual(results, [true, true, true], 'sign results');
            var invalidTags = ['invalid-1', 'invalid-2', 'invalid-3'];
            async.mapSeries(invalidTags, function (tag, callback) {
                api.verify(tag, { insecure: true }, function (err, result) {
                    callback(null, { err: err, result: result });
                });
            }, callback);
        },
        function (results, callback) {
            t.ok(/EVTag.*mismatch/.test(results[0].err.message), 'invalid #1');
            t.ok(/Secure-Tag.*mismatch/.test(results[1].err.message), 'invalid #2');
            t.ok(/No.*found/.test(results[2].err.message), 'invalid #3');
            t.ok(!results[0].result, 'invalid #1 result');
            t.ok(!results[1].result, 'invalid #2 result');
            t.ok(!results[2].result, 'invalid #3 result');
            callback(null);
        },
    ], function (err) {
        fixtures.destroy();
        t.end(err);
    });
});
