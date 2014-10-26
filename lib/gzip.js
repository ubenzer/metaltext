"use strict";

var _          = require("underscore"),
    zlib       = require("zlib"),
    multimatch = require("multimatch"),
    extendify  = require("extendify"),
    debug      = require("debug");
debug = debug("metaltext:gzip");
_.extendDeep = extendify();

function plugin(options) {
  options = normalize(options);

  return function (files, metalsmith, done) {

    var filesTbSanitized = multimatch(Object.keys(files), options.src);

    var asyncDone = _.after(filesTbSanitized.length, function() {
      done();
    });

    _.each(filesTbSanitized, function(file) {
      var data = files[file];

      zlib.gzip(data.contents, function (err, buffer) {
        if (err !== null) {
          debug("A file failed to be gzipped: %s", err);
          throw new Error();
        }
        var compressedFile = file + ".gz";
        files[compressedFile] = {
          contents: buffer
        };

        asyncDone();
      });
    });

  };
}

function normalize(options) {
  var defaults = {
    src: ["**/*"]
  };
  options = _.extend({}, defaults, options);

  return options;
}

module.exports = plugin;
