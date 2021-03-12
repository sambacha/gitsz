'use strict';
function parseTree(buf) {
    var off = 0;
    var entries = [];
    while (off < buf.length) {
        var i = void 0;
        for (i = off; i < buf.length; i++)
            if (buf[i] === 0x00)
                break;
        if (i + 1 >= buf.length)
            throw new Error('Tree entry\'s name not found');
        var name_1 = buf.slice(off, i).toString();
        off = i + 1;
        if (off + 20 > buf.length) {
            throw new Error('Not enough space for tree entry\'s hash');
        }
        var hash = buf.slice(off, off + 20).toString('hex');
        off += 20;
        var parts = name_1.split(' ');
        entries.push({
            mode: parts[0],
            name: parts[1],
            hash: hash,
        });
    }
    return entries;
}
exports.parseTree = parseTree;
