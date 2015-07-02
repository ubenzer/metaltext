#!/usr/bin/env node

"use strict";
var Metalsmith = require("metalsmith");
var collections = require("metalsmith-json-taxonomy");
var patternMove = require("metalsmith-pattern-move");
var rhoRenderHelpers = require("../lib/rhoRenderHelpers.js");
var createPostJson = require("../lib/createPostJson.js");
var createCollectionJson = require("../lib/createCollectionJson.js");
var title = require("metalsmith-title");
var supportRho = require("metalsmith-support-rho");
var excerpts = require("../lib/excerpts.js");
var removeTitle = require("../lib/removeFirstTitle.js");
var program = require("../lib/program.js");
var gzip = require("metalsmith-gzip");
var times = require("../lib/times");
var htmlMinifier = require("metalsmith-html-minifier");
var wordcount = require("metalsmith-word-count");

var config = program.getConfig();

/* Enable metalsmith time calculating for each plugin */
var metalsmith = new Metalsmith(process.cwd());
times(metalsmith);

metalsmith
  .source(config.build.source)
  .destination(config.build.destination)
  .ignore(["**/.*"])
  .use(title(), "title") // extract titles from posts
  .use(patternMove({
    cwd: "posts",
    src: "**/*",
    dest: "single"
  }), "patternMove")
  .use(supportRho({
    blockCompiler: rhoRenderHelpers.getBlockCompilerOnSteroids({
      staticFilePrefix: "/single"
    }),
    match: "**/*.md"
  }), "supportRho")
  .use(removeTitle({
    src: ["content/**/*.html"]
  }), "removeTitle")
  .use(excerpts({
    src: ["content/**/*.html"]
  }), "excerpts")
  .use(wordcount({
    raw: true
  }), "wordcount")
  .use(htmlMinifier(), "htmlMinifier")
  .use(collections(config.collections), "collections")
  .use(createPostJson({
    src: "single/**/*.html",
    pathPrefix: "single/"
  }), "createPostJson")
  .use(createCollectionJson({
    collectionConfig: config.collections,
    frontendConfig: config.frontend
  }), "createCollectionJson")
  .use(gzip({src: "**/*"}), "gzip")
  .build(function(err, files) {
    if (err) {
      console.error("Build error occurred");
      console.error(err);
      return;
    }

    console.log("Build complete. " + Object.keys(files).length + " files processed.");
  });


