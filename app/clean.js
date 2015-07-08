"use strict";

var rmdir = require("rmdir");
var config = require("./program.js").getConfig();
var debug = require("debug")("clean");
var mkdirp = require("mkdirp");

module.exports = {
  cleanDestination: cleanDestination.bind(this, "destination"),
  cleanFeDestination: cleanDestination.bind(this, "feDestination"),
};

function cleanDestination(key) {
  if (config.args.skipClean === true) {
    debug("Skipping clean due to config.");
    return Promise.resolve();
  }

  mkdirp.sync(config.build[key]);

  return new Promise(function(resolve, reject) {
    rmdir(config.build[key], function(err) {
      if (err) {
        debug("Cleaning %s failed!", key);
        reject(err);
      }
      debug("Cleaning %S completed!", key);
      resolve();
    });
  });
}
