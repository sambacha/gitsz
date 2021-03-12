'use strict';
var tape = require('tape');
var fixtures = require('./fixtures');
var cli = fixtures.cli;
var cmd = fixtures.cmd;
tape('evtag interop', function (t) {
    var repos = [
        'git://github.com/cgwalters/git-evtag.git',
        'git://github.com/ostreedev/ostree.git',
        'git://github.com/GNOME/gnome-terminal.git',
        'https://gitlab.com/fidencio/libosinfo.git',
    ];
    repos.forEach(function (url) {
        fixtures.clone(url);
        var tags = fixtures.tags();
        // Verify tags
        var node = process.execPath;
        tags.forEach(function (tag) {
            t.doesNotThrow(function () { return cmd(node, [cli, '--insecure', '-v', tag]); }, "tag " + tag + " of " + url + " should validate");
        });
        fixtures.destroy();
    });
    t.end();
});
