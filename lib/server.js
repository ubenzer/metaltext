"use strict";
var debug    = require("debug")("metaltext:serve");
var chokidar = require("chokidar");
var statik   = require("node-static");
var http     = require("http");
var _        = require("underscore");
var tinylr   = require("tiny-lr");

function Server() {
  this.isBuildInProgress = false;
  this.lrServer = null;
}

Server.prototype.startServer = function startServer(dir, port) {
  var fileServer = new statik.Server(dir);

  http.createServer(function (request, response) {
    request.addListener("end", function () {
      fileServer.serve(request, response);
    }).resume();
  }).listen(port, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    debug("Server started on port %s", port);
  });
};

Server.prototype.noftyBuildEnd = function() {
  this.isBuildInProgress = false;
  if (this.lrServer !== null) {
    this.lrServer.changed({body:{files: ".autoreload"}});
  }
};

Server.prototype.startAutoreload = function autoreload(dir, chokiarSettings, buildFn, port) {
  var self = this;
  // Start autoreload server
  self.lrServer = tinylr();
  self.lrServer.listen(port, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    debug("Auto reload enabled on port %s", port);
  });

  var debouncedOnChangeHandler = _.debounce(onChangeHandler, 500);

  // Start watching source files
  chokidar.watch(dir, chokiarSettings).on("all", debouncedOnChangeHandler);

  function onChangeHandler(event, path) {
    console.log("Change: " + event + ":" + path);
    if (self.isBuildInProgress) {
      _.delay(debouncedOnChangeHandler, 500, event, path);
      return;
    } // We don't run simultanious builds at the same time.
    startBuild();
  }

  function startBuild() {
    self.isBuildInProgress = true;
    buildFn();
  }
};

module.exports = Server;
