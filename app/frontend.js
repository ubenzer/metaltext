"use strict";

var Download = require("download");
var config = require("./program.js").getConfig();
var fs = require("fs-extra");
var path = require("path");
var debug = require("debug")("frontend");
var _ = require("lodash");
var ZIPBALL_DIR_NAME = "metaltext-fe-release-bleeding-edge";

module.exports = {
  downloadFrontendAssets: downloadFrontendAssets,
  createCNAME: createCNAME
};

function downloadFrontendAssets() {
  if (config.args.skipFrontend === true) {
    debug("Skipping frontend asset generation due to config.");
    return Promise.resolve();
  }


  return new Promise(function(resolve, reject) {
    var feSource = config.build.feSource;
    if (_.startsWith(feSource, "http")) {
      new Download({
          mode: "755",
          extract: true
        })
        .get(feSource, config.build.feDestination)
        .rename(function(pth) {
          var pths = pth.dirname.split(path.sep);
          _.remove(pths, function(p) {
            return p === ZIPBALL_DIR_NAME;
          });
          pth.dirname = path.join.apply(this, pths);
        })
        .run(function(err) {
          if (err) {
            debug("Downloading frontend completed with errors!");
            reject(err);
          }
          debug("Downloading frontend assets completed successfully!");
          resolve();
        });
    } else {
      fs.copy(feSource, config.build.feDestination, function(err) {
        if (err) {
          debug("Copying frontend completed with errors!");
          reject(err);
        }
        debug("Copying frontend assets completed successfully!");
        resolve();
      });
    }
  });
}

function createCNAME() {
  if (config.args.skipFrontend === true) {
    debug("Skipping frontend asset generation due to config.");
    return Promise.resolve();
  }

  var domain = config.build.domain;
  if (domain === null) {
    debug("Skipping CNAME since there is no configuration exists!");
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    var dest = config.build.feDestination;
    var CNAMEFile = path.join(dest, "CNAME");

    fs.writeFile(CNAMEFile, domain, function(err) {
      if (err) {
        debug("CNAME failed");
        reject(err);
      }
      debug("CNAME succeeded");
      resolve();
    });
  });
}
