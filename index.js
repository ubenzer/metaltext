"use strict";
var Metalsmith 		       = require("metalsmith"),
    collections          = require("metalsmith-multiple-collections"),
    patternMove          = require("metalsmith-pattern-move"),
    templates            = require("metalsmith-templates"),
    ignore               = require("metalsmith-ignore"),
    url                  = require("metalsmith-page-url"),
    slug                 = require("metalsmith-slug"),
    title 			         = require("metalsmith-title"),
    saveOriginalLocation = require("metalsmith-save-original-location"),
    supportRho     			 = require("metalsmith-support-rho"),
    rhoSteroid					 = require("rho-on-steroids"),
    path   				       = require("path"),
    define							 = require("metalsmith-define"),
    s 									 = require("string"),
    _										 = require("underscore"),
    moment               = require("moment"),
    Server               = require("./lib/server"),
    excerpts             = require("./lib/excerpts.js"),
    removeTitle          = require("./lib/removeFirstTitle.js"),
    gzip                 = require("./lib/gzip.js"),
    uglify               = require("metalsmith-uglify"),
    times                = require("./lib/times"),
    htmlMinifier         = require("metalsmith-html-minifier"),
    sass                 = require("metalsmith-sass");

// Initial config
moment.locale("tr"); // Set locale
var source = "src";
var destination = "build";
var serve = true;
var port = 8080;

var server = null;
if (serve) {
  server = new Server();
  server.startServer(path.join(__dirname, destination), port);
  server.startAutoreload(path.join(__dirname, source), {
    ignored: /[\/\\]\./,
    ignoreInitial: true,
    persistent: true
  }, buildAction, 35000);
}


/*var imageTypeDimensionsLookup = {
  medium: [
    {
      name: ":file-:hash-medium",
      ext: null, //same
      width: null,
      height: null
    }
  ]
};*/

buildAction();
function buildAction() {
  var tbProcessedImagesGlobal = {};
  /* Enable metalsmith time calculating for each plugin */
  var metalsmith = new Metalsmith(__dirname);
  times(metalsmith);

  metalsmith
    .source(source)
    .destination(destination)
    .use(ignore([
      "templates/**/*"
    ]), "ignore")
    .use(saveOriginalLocation(), "saveOriginalLocation")
    .use(title(), "title")
    .use(collections({
      src: "**/*.md",
      templateDir: "collections",
      templates: [
        {
          file: "collection.jade",
          permalink: "collections/:collection/:collectionItem/:page/index.html",
          fistPagePermalink: "collections/:collection/:collectionItem/index.html",
          pageLimit: null,
          paginateBy: 10
        }, {
          file: "rss.jade",
          fistPagePermalink: "collections/:collection/:collectionItem.rss",
          pageLimit: 1,
          paginateBy: 10
        }
      ],
      collectionContentsTemplates: [
        {
          file: "collectionContents.jade",
          permalink: "collections/:collection/index.html"
        }
      ],
      collectionListTemplates: [
        {
          file: "collectionList.jade",
          permalink: "collections/index.html"
        }
      ],
      collections: {
        all: {
          name: "All",
          filterFn: function () {
            return "all";
          },
          sortBy: "date",
          reverse: true,
          templates: [
            {
              file: "collection.jade",
              permalink: "sayfa/:page/index.html",
              fistPagePermalink: "index.html",
              pageLimit: null,
              paginateBy: 10
            },
            {
              file: "rss.jade",
              fistPagePermalink: "feed.rss",
              pageLimit: 1,
              paginateBy: 10
            }
          ]
        },
        date: {
          name: "Date Archive",
          filterFn: function (data) {
            return data.date.getYear() + " - " + data.date.getMonth();
          },
          readableNameFn: function (collectionContentName) {
            return "readable" + collectionContentName;
          },
          sortBy: "date",
          reverse: true,
          templates: [{
            file: "collection.jade",
            permalink: "date/:collectionItem/:page/index.html",
            fistPagePermalink: "date/:collectionItem/index.html",
            pageLimit: null,
            paginateBy: 10
          }, {
            file: "rss.jade",
            fistPagePermalink: "date/:collectionItem.atom",
            pageLimit: 1,
            paginateBy: 10
          }]
        },
        tag: {
          name: "Tags",
          sortBy: "date",
          reverse: true
        },
        category: {
          name: "Categories",
          sortBy: "date",
          reverse: true
        },
        place: {
          name: "Places",
          sortBy: "date",
          reverse: true
        },
        people: {
          name: "People",
          sortBy: "date",
          reverse: true
        }
      }
    }), "collections")
    .use(slug({
      patterns: ["*.md"],
      property: "title"
    }), "slug")
    .use(patternMove({
      cwd: "content/posts",
      src: "**/*",
      dest: ":year/:slug",
      inGroupPath: function (file, groupId, isMaster) {
        var extension = path.extname(file);
        if (isMaster) {
          return "index" + extension;
        }
        return s(file).between(groupId).chompLeft(path.sep).s;
      },
      getGroupId: function (file) {
        var extension = path.extname(file);
        var fileNameWithoutExtension = path.basename(file, extension);
        var directoryOfFile = path.dirname(file);

        var directories = directoryOfFile.split(path.sep);
        if (directories.length <= 2) {
          return fileNameWithoutExtension;
        }
        return directories[directories.length - 1];
      },
      isGroupMaster: function (file) {
        var extension = path.extname(file);
        var directoryOfFile = path.dirname(file);

        return extension === ".md" && directoryOfFile.split(path.sep).length <= 3;
      }
    }), "patternMove")
    .use(supportRho({
      blockCompiler: function (file, data) {
        return rhoSteroid({
          renderImg: function (escapedAlt, src, flags) {
            if (checkOwnUrl(src)) {
              data.$tbProcessedImages = data.$tbProcessedImages || {};
              data.$tbProcessedImages[src] = data.$tbProcessedImages[src] || {
                flags: [],
                alt: escapedAlt
              };
              data.$tbProcessedImages[src].flags = _.union(data.$tbProcessedImages[src].flags, flags);

              return generateParseLater(src, "image");
            }
            return renderImg(escapedAlt, src, flags);
          },
          renderA: function (text, url, flags) {
            if (checkOwnUrl(url)) {
              data.$tbProcessedLinks = data.$tbProcessedLinks || {};
              data.$tbProcessedLinks[url] = data.$tbProcessedLinks[url] || {
                flags: [],
                text: text
              };

              return generateParseLater(url, "url");
            }
            return renderA(text, url, flags);
          }
        });

        function checkOwnUrl(url) {
          var surl = s(url);
          return !(surl.contains("://") || surl.startsWith("//"));
        }

      },
      match: "**/*.md"
    }), "supportRho")
    .use(removeTitle({
      src: ["content/**/*.html"]
    }), "removeTitle")
    //.use(markdown({
    //	highlight: function (code) {
    //		return require("highlight.js").highlightAuto(code).value;
    //	}
    //	// override a tag to fix path and open x-domain new tab
    //}))
    .use(url(), "url")
    .use((function fillIdUrlMap(globalTbProcessedImageList) {
      var _ = require("underscore");
      return function normalizeIds(files, metalsmith, done) {

        _.each(files, function (data) {
          // normalize links
          _.each(data.$tbProcessedLinks, function (linkDetail, url) {
            var normalizedUrl = normalizeUrl(data, url);

            var renderedA = renderA(linkDetail.text, normalizedUrl, linkDetail.flags);
            data.contents = new Buffer(s(data.contents.toString()).replaceAll(generateParseLater(url, "url"), renderedA).s);
          });

          // normalize tb processed image list and append it to global list
          _.each(data.$tbProcessedImages, function (imgDetail, src) {
            var normalizedSrc = normalizeUrl(data, src);

            globalTbProcessedImageList[normalizedSrc] = globalTbProcessedImageList[normalizedSrc] || [];
            globalTbProcessedImageList[normalizedSrc] = _.union(globalTbProcessedImageList[normalizedSrc], imgDetail.flags);

            var renderedImg = renderImg(imgDetail.alt, normalizedSrc, imgDetail.flags);
            data.contents = new Buffer(s(data.contents.toString()).replaceAll(generateParseLater(src, "image"), renderedImg).s);
          });

        });

        done();

        function normalizeUrl(file, tbNormalizedUrl) {
          // These doesn't require normalizing:
          // absolute urls: {something}://{something}
          // protocol-free absoulte urls: //{something}
          // relative-to site home urls: /category/something etc.

          // These needs normalizing:
          // relative-to-page urls: image.jpg
          // urls that have a reference in it: @reference @reference/image.jpg

          // check for reference, and resolve if there is one
          tbNormalizedUrl = resolveIdReference(tbNormalizedUrl);

          // fix paths
          if (!s(tbNormalizedUrl).startsWith("/")) {
            tbNormalizedUrl = s(file.$groupUrl).ensureLeft("/").ensureRight("/").s + s(tbNormalizedUrl).chompLeft("/").s;
          }

          return tbNormalizedUrl;
        }

        function resolveIdReference(urlWithMaybeReference) {
          var reference;
          var isFullReference = false;
          var surlWithMaybeReference = s(urlWithMaybeReference);
          reference = surlWithMaybeReference.between("@", "/").s;
          if (reference.length === 0 && surlWithMaybeReference.contains("@")) {
            reference = urlWithMaybeReference.substr(urlWithMaybeReference.indexOf("@") + 1);
            isFullReference = true;
          }
          if (reference.length === 0) {
            return urlWithMaybeReference; // no ref found
          }

          var normalizedUrl;
          var groupMaster = _.where(files, {$groupId: reference, $groupMaster: true});
          if (groupMaster.length !== 1) {
            throw new Error("Couldn't find group master for id " + reference);
          }
          groupMaster = groupMaster[0];

          if (isFullReference) {
            normalizedUrl = surlWithMaybeReference.replaceAll("@" + reference, groupMaster.url);
          } else {
            normalizedUrl = surlWithMaybeReference.replaceAll("@" + reference, groupMaster.$groupUrl);
          }
          return normalizedUrl.s;
        }
      };
    })(tbProcessedImagesGlobal))
    .use(excerpts({
      src: ["content/**/*.html"]
    }), "excerpts")
    .use(define({
      /* Assign global template related vars */
      moment: moment,
      $template: {
        assets: "/assets"
      },
      $site: {
        name: "My blog",
        description: "My sample blog",
        url: "http://myblog.com", // If you have SSL, use https,
        buildDate: new Date(),
        language: "tr-TR"
      }
    }), "define")
    .use(templates({
      engine: "jade",
      directory: "src/templates",
      default: "jade-partials/post.jade",
      pattern: ["**/*.html", "**/*.rss"],
      pretty: true
    }), "templates")
    //.use(generateImages({
    //	imageList: metalsmith.images
    //}))
    .use(sass({
      outputStyle: "compressed",
      imagePath: "assets/img"
    }), "sass")
    .use(uglify({
      filter: ["assets/js/**/*.js", "!assets/js/lib/**"],
      sourceMap: true
    }), "uglify")
    //.use(htmlMinifier())
    .use(gzip(), "gzip")
    .build(function (err, files) {
      if (server !== null) {
        server.noftyBuildEnd();
      }
      if (err) {
        console.error("Build error occurred");
        console.error(err);
        return;
      }
      console.log("Build complete. " + Object.keys(files).length + " files processed.");
    });

  function renderImg(alt, src, flags) {
    return "<img src=\"" + src + "\" alt=\"" + alt + "\" class=\"" + s(_.reduce(flags, function (prev, cur) {
        return prev + " " + cur;
      }, "")).trim().s + "\">";
  }

  function renderA(text, href, flags) {
    return "<a href=\"" + href + "\" class=\"" + s(_.reduce(flags, function (prev, cur) {
        return prev + " " + cur;
      }, "")).trim().s + "\"" + (_.contains(flags, "blank") ? "target=\"_blank\"" : "") + ">" + text + "</a>";
  }

  function generateParseLater(thing, type) {
    var PARSE_LATER_START = "__PARSE_LATER_START[";
    var PARSE_LATER_SEPERATOR = "||";
    var PARSE_LATER_END = "]END_LATER_PARSE";

    return PARSE_LATER_START + thing + PARSE_LATER_SEPERATOR + type + PARSE_LATER_END;
  }
}
