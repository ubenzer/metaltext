"use strict";

var Metalsmith = require("metalsmith");
var config = require("../app/program.js").getConfig();
var collections = require("../metalsmith/collections.js");
var patternMove = require("metalsmith-pattern-move");
var rhoRenderHelpers = require("../metalsmith/rhoRenderHelpers.js");
var createPostJson = require("../metalsmith/createPostJson.js");
var createCollectionJson = require("../metalsmith/createCollectionJson.js");
var title = require("metalsmith-title");
var supportRho = require("metalsmith-support-rho");
var excerpts = require("../metalsmith/excerpts.js");
var removeTitle = require("../metalsmith/removeFirstTitle.js");
var times = require("../metalsmith/times");
var htmlMinifier = require("metalsmith-html-minifier");
var wordcount = require("metalsmith-word-count");
var debug = require("debug")("backend");

module.exports = {
  build: build
};

function build() {
  if (config.args.skipBackend === true) {
    debug("Skipping backend build because it is disabled by parameters.");
    return Promise.resolve();
  }

  return new Promise(function(resolve, reject) {
    /* Enable metalsmith time calculating for each plugin */
    var metalsmith = new Metalsmith(process.cwd());
    times(metalsmith);

    metalsmith
      .source(config.build.source)
      .destination(config.build.destination)
      .clean(false)
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
        src: ["**/*.html"]
      }), "removeTitle")
      .use(excerpts({
        src: ["**/*.html"]
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
      .build(function(err, files) {
        if (err) {
          console.error("Build error occurred");
          reject(err);
          return;
        }
        console.log("Build complete. " + Object.keys(files).length + " files processed.");
        resolve();
      });
  });
}


