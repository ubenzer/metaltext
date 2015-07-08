#!/usr/bin/env node --harmony

"use strict";
var config = require("../app/program.js").getConfig();
var frontend = require("../app/frontend.js");
var backend = require("../app/backend.js");
var project = require("../app/project.js");
var clean = require("../app/clean.js");

runApp();

function runApp() {
  if (config.args.travis === true) {
    project.createTravisConfiguration()
      .then(function() {
        console.log("Travis file added successfully.");
      })
      .catch(function(error) {
        console.error("Adding travis configuration failed!", error);
        throw error;
      });
    return;
  }

  clean.cleanDestination()
    .then(clean.cleanFeDestination)
    .then(frontend.downloadFrontendAssets)
    .then(frontend.createCNAME)
    .then(backend.build)
    .then(function() {
      console.log("Metaltexting successfully completed!");
    })
    .catch(function(error) {
      console.error("Some job failed", error);
      throw error;
    });
}
