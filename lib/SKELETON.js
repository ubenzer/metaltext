"use strict";

var multimatch = require("multimatch"),
    _ = require("lodash"),
    debugModule = require("debug");

var debug = debugModule("MODULENAME");

function plugin(options) {

  options = normalize(options);

  return function(files, metalsmith, done) {
    var filesTbProcessed = multimatch(Object.keys(files), options.src);

    _.each(filesTbProcessed, function (fileName) {
      var file = files[fileName];
      debug("Started " + fileName + "...");
      file.contents.toString();
    });

    done();
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
