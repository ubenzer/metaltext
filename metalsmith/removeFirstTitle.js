"use strict";

var _ = require("lodash");
var cheerio = require("cheerio");
var multimatch = require("multimatch");

function plugin(options) {
  options = normalize(options);

  return function(files, metalsmith, done) {
    var filesTbSanitized = multimatch(Object.keys(files), options.src);

    _.each(filesTbSanitized, function(fileName) {
      var data = files[fileName];

      var $ = cheerio.load(data.contents.toString());

      var firstElement = $("*").first();
      if (firstElement.is("h1")) {
        firstElement.remove();
        data.contents = new Buffer($.html().trim());
      }
    });

    done();
  };
}

function normalize(options) {
  var defaults = {
    src: ["**/*.html"]
  };
  options = _.extend({}, defaults, options);

  return options;
}

module.exports = plugin;
