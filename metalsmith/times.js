"use strict";
var moment = require("moment");
var _ = require("lodash");

function enableTimer(metalsmith) {
  var no = 0;
  var originalUse = metalsmith.use;

  var timerEnabledUse = function(fn, maybeName) {
    no++;
    var currentNo = no;

    var wrappedFn = function(files, ms, done) {
      var startTime = new Date();
      var wrappedDone = function() {
        var fnName = getFunctionName(maybeName, fn.name, currentNo);
        console.log(fnName + " - " + moment().diff(startTime, "seconds") + " seconds.");
        return done.apply(global, arguments);
      };

      return fn.call(global, files, ms, wrappedDone);
    };

    return originalUse.call(metalsmith, wrappedFn);
  };
  metalsmith.use = timerEnabledUse;
}

function getFunctionName(userProvidedName, inferredName, no) {
  if (_.isString(userProvidedName)) {
    return userProvidedName;
  }
  if (_.isString(inferredName)) {
    return inferredName;
  }
  return "<undetermined " + no + ">";
}
module.exports = enableTimer;
