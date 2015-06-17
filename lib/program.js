"use strict";
var path = require("path");
var _ = require("lodash");
var program = require("commander");

program
  .option("-c, --config [fileName]", "Custom config file")
  .parse(process.argv);

function getConfig() {
  var customConfig = {};
  var defaultConfig = require("../conf/default.js");

  if (_.isString(program.config)) {
    var normalizedPath = program.config;
    if (!path.isAbsolute(program.config)) {
      normalizedPath = path.normalize("../conf", program.config);
    }

    customConfig = require(normalizedPath);
  }

  return _.merge({}, defaultConfig, customConfig);
}

var api = {
  getConfig: getConfig
};

module.exports = api;
