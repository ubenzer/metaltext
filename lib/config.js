"use strict";
var fs = require("fs"),
  path = require("path"),
  yargs = require("yargs"),
  _ = require("lodash");

function readConfig() {
  var argv = yargs.argv;

  _.each(argv, function(value, key) {
    if (value === "true") {
      argv[key] = true;
    } else if (value === "false") {
      argv[key] = false;
    }
  });

  var conf = {};

  if (_.isString(argv.config)) {
    conf = JSON.parse(fs.readFileSync(argv.config), "utf8");
  }

  // read config file
  var base = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "conf", "default.json"), "utf8"));

  // fill undefined values with default config
  var tbReturned = _.merge({}, base, conf);
  _.each(tbReturned, function(value, key) {
    if(!_.isUndefined(argv[key])) {
      // override args
      tbReturned[key] = argv[key];
    }
  })
  return tbReturned;
}

module.exports = readConfig;
