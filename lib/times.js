"use strict";

var moment = require("moment"),
    check  = require("check-types");

function enableTimer(metalsmith) {
  var no = 0;
  var originalUse = metalsmith.use;

  var timerEnabledUse = function(fn, maybeName) {
    no++;
    var currentNo = no;

    var wrappedFn = function(files, metalsmith, done) {
      var startTime = new Date();
      var wrappedDone = function() {
        var fnName = getFunctionName(maybeName, fn.name, currentNo);
        console.log(fnName + " - " + moment().diff(startTime, "seconds") + " seconds.");
        return done.apply(global, arguments);
      };

      return fn.call(global, files, metalsmith, wrappedDone);
    };

    return originalUse.call(metalsmith, wrappedFn);
  };
  metalsmith.use = timerEnabledUse;

}

function getFunctionName(userProvidedName, inferredName, no) {
  if (check.string(userProvidedName)) {
    return userProvidedName;
  }
  if (check.string(inferredName)) {
    return inferredName;
  }
  return "<undetermined " + no + ">";
}
module.exports = enableTimer;
