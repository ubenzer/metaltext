"use strict";

var s = require("string");
var multimatch = require("multimatch");
var _ = require("lodash");
var debug = require("debug")("create-post-json");
var path = require("path");

function plugin(options) {
  options = normalize(options);

  return function(files, metalsmith, done) {
    var filesTbProcessed = multimatch(Object.keys(files), options.src);

    _.each(filesTbProcessed, function(fileName) {
      var file = files[fileName];
      debug("Started " + fileName + "...");

      var finalJson = {
        id: file.$groupId,
        name: file.title,
        content: file.contents.toString(),
        config: {
          readingTime: file.readingTime,
          wordCount: file.wordCount
        },
        collections: file.$collections
      };

      var newFileName = path.join(options.pathPrefix, (s(file.$groupUrl).ensureLeft("/").s), "index.json");

      file.contents = new Buffer(JSON.stringify(finalJson));

      delete files[fileName];
      files[newFileName] = file;
    });

    done();
  };
}

function normalize(options) {
  var defaults = {
    src: ["**/*"],
    pathPrefix: ""
  };
  options = _.merge({}, defaults, options);

  return options;
}

module.exports = plugin;
