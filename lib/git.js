"use strict";

var nodegit = require("nodegit"),
    _ = require("lodash"),
    debugModule = require("debug");

var Repository = nodegit.Repository;

var debug = debugModule("MODULENAME");

function pushToGit(options) {

  Repository.init(options.path, false);


}

module.exports = pushToGit;
