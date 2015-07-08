"use strict";
var path = require("path");
var _ = require("lodash");
var program = require("commander");

var cachedConfig = null;

program
  .option("-c, --config [fileName]", "Custom config file")
  .option("--skip-clean", "Skip cleaning build directory")
  .option("--skip-frontend", "Skio setting up frontend")
  .option("--skip-backend", "Skip content generation")
  .option("-t, --travis", "Generates travis configuration")
  .parse(process.argv);

function getConfig() {
  if (cachedConfig === null) {
    var customConfig = {};
    var defaultConfig = require("../conf/default.js");

    if (_.isString(program.config)) {
      var normalizedPath = program.config;
      if (!path.isAbsolute(program.config)) {
        normalizedPath = path.normalize(path.join(process.cwd(), program.config));
      }

      customConfig = require(normalizedPath);
    }

    cachedConfig = _.merge({args: program}, defaultConfig, customConfig);
  }
  return cachedConfig;
}

var api = {
  getConfig: getConfig
};

module.exports = api;
