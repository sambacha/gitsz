// SPDX-License-Identifier: MIT

// taruerreotype
import { pack as _pack, extract as _extract } from 'tar-stream';
import duplexer from 'duplexer';

var UNIXZERO = new Date(new Date().getTimezoneOffset() * -1);

var deterministic = (module.exports = function (map) {
  var pack = _pack();

  var extract = _extract()
    .on('entry', function (header, stream, cb) {
      if (header.type !== 'file') return cb();

      header.mtime = header.atime = header.ctime = UNIXZERO;
      header.uid = header.gid = 0;

      delete header.uname;
      delete header.gname;

      header.mode = header.type === 'directory' ? 0755 : 0644;

      if (map) header = map(header) || header;

      stream.pipe(pack.entry(header, cb));
    })
    .on('finish', function () {
      pack.finalize();
    });

  return duplexer(extract, pack);
});
