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
      if (_.isString(data.excerpt)) { return; }

      var $ = cheerio.load(data.contents.toString());

      var firstElement = $("p").first();
      var html = firstElement.html();
      if (html !== null) {
        data.excerpt = html.trim();
      } else {
        data.excerpt = "";
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
