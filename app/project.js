"use strict";

var fs = require("fs");
var path = require("path");
var debug = require("debug")("project");
var _ = require("lodash");
var config = require("./program.js").getConfig();

module.exports = {
  createTravisConfiguration: createTravisConfiguration
};

function createTravisConfiguration() {
  var missingConfig = false;
  Object.keys(config.build.travis).forEach(function(k) {
    missingConfig = missingConfig || config.build.travis[k] === null;
  });
  if (missingConfig) {
    debug("Skipping travis since there is no configuration exists!");
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    try {
      var travisTemplateStr = fs.readFileSync(path.join(__dirname, "travis.yml"), "utf8");
      var travisTemplate = _.template(travisTemplateStr, {interpolate: /{{([\s\S]+?)}}/g});
      var compiled = travisTemplate(config.build.travis);
      var travisFile = path.join(process.cwd(), ".travis.yml");

      fs.writeFileSync(travisFile, compiled);
      debug("Travis generation succeeded.");

      resolve();
    } catch(e) {
      debug("Travis generation failed.");
      reject(e);
    }
  });
}
