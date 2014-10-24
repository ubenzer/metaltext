"use strict";

var _          = require("underscore"),
    cheerio    = require("cheerio"),
    check      = require("check-types"),
    multimatch = require("multimatch");

function plugin(options) {
  options = normalize(options);

  return function (files, metalsmith, done) {

    var filesTbSanitized = multimatch(Object.keys(files), options.src);

    _.each(filesTbSanitized, function(fileName) {
      var data = files[fileName];
      if (check.string(data.excerpt)) { return; }

      var $ = cheerio.load(data.contents.toString());

      var firstElement = $("p").first();
      data.excerpt = firstElement.html().trim();
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
