"use strict";
var metalsmith 		       = require("metalsmith"),
    collections          = require("metalsmith-multiple-collections"),
    patternMove          = require("metalsmith-pattern-move"),
    templates            = require("metalsmith-templates"),
    ignore               = require("metalsmith-ignore"),
    url                  = require("metalsmith-page-url"),
    slug                 = require("metalsmith-slug"),
    title 			         = require("metalsmith-title"),
    saveOriginalLocation = require("metalsmith-save-original-location"),
    supportRho     			 = require("metalsmith-rho"),
    rhoSteroid					 = require("rho-on-steroids"),
    path   				       = require("path"),
    define							 = require("metalsmith-define"),
    s 									 = require("string"),
    _										 = require("underscore"),
    statik               = require("node-static"),
    moment               = require("moment");
    //check 							 = require("check-types");
    //excerpts       = require("metalsmith-excerpts"),
    //atom           = require("metalsmith-atom"),

moment.locale("tr");

var imageTypeDimensionsLookup = {
  medium: [
    {
      name: ":file-:hash-medium",
      ext: null, //same
      width: null,
      height: null
    }
  ]
};

// TEMPORARY AUTORELOAD
var tinylr = require("tiny-lr");
var lrserver = tinylr();
lrserver.listen(35729, function(err) {
  if (err) { return console.log(err); }
});


require("chokidar").watch(path.join(__dirname, "src"), {
  ignored: /[\/\\]\./,
  ignoreInitial: true
}).on("all", _.debounce(function(event, path) {
  console.log(event, path);
  msAction();
  console.log("trigger reload");
  setTimeout(function() {
    lrserver.changed({body:{files:path}});
  }, 2000);
}, 500));

// TEMPORARY SERVER
var fileServer = new statik.Server(path.join(__dirname, "build"));

require("http").createServer(function (request, response) {
  request.addListener("end", function () {
    fileServer.serve(request, response);
  }).resume();
}).listen(8080);

msAction();
function msAction() {
  var tbProcessedImagesGlobal = {};
  metalsmith(__dirname)
    .source("src")
    .destination("build")
    .use(ignore([
      "templates/**/*"
    ]))
    .use(saveOriginalLocation())
    .use(title())
    .use(collections({
      src: "**/*.md",
      templateDir: "collections",
      templates: [
        {
          file: "collection.jade",
          permalink: "collections/:collection/:collectionItem/:page/index.html",
          fistPagePermalink: "collections/:collection/:collectionItem/index.html",
          pageLimit: null,
          paginateBy: 2
        }, {
          file: "rss.jade",
          fistPagePermalink: "collections/:collection/:collectionItem.rss",
          pageLimit: 1,
          paginateBy: 10
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
              paginateBy: 2
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
            paginateBy: 2
          }, {
            file: "rss.jade",
            fistPagePermalink: "date/:collectionItem.rss",
            pageLimit: 1
          }]
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
    }))
    //.use(excerpts())
    .use(slug({
      patterns: ["*.md"],
      property: "title"
    }))
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
    }))
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

      }
    }))
    //.use(markdown({
    //	highlight: function (code) {
    //		return require("highlight.js").highlightAuto(code).value;
    //	}
    //	// override a tag to fix path and open x-domain new tab
    //}))
    .use(url())
    .use((function fillIdUrlMap(globalTbProcessedImageList) {
      var _ = require("underscore");
      return function normalizeIds(files, metalsmith, done) {

        _.each(files, function (data, file) {
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
    .use(define({
      /* Assign global template related vars */
      moment: moment,
      $template: {
        assets: "/assets"
      }
    }))
    .use(templates({
      engine: "jade",
      directory: "src/templates",
      default: "jade-partials/post.jade",
      pattern: ["**/*.html", "**/*.rss"],
      pretty: true
    }))
    //.use(generateImages({
    //	imageList: metalsmith.images
    //}))
    //.use(less({
    //	path: "static/less/*"
    //}))
    //.use(minify({
    //	path: "static/js/*"
    //}))
    //.use(gzip({
    //	path: "*"
    //}))
    .build(function (err, files) {
      if (err) {
        throw err;
      }
    });

  function renderImg(alt, src, flags) {
    return "<img src=\"" + src + "\" alt=\"" + alt + "\" class=\"" + s(_.reduce(flags, function (prev, cur) {
        return prev + " " + cur;
      }, "")).trim().s + "\">";
  }

  function renderA(text, href, flags) {
    return "<a href=\"" + href + "\" class=\"" + s(_.reduce(flags, function (prev, cur) {
        return prev + " " + cur;
      }, "")).trim().s + "\"" + (_.contains(flags, "external") ? "target=\"_blank\"" : "") + ">" + text + "</a>";
  }

  function generateParseLater(thing, type) {
    var PARSE_LATER_START = "__PARSE_LATER_START[";
    var PARSE_LATER_SEPERATOR = "||";
    var PARSE_LATER_END = "]END_LATER_PARSE";

    return PARSE_LATER_START + thing + PARSE_LATER_SEPERATOR + type + PARSE_LATER_END;
  }
}
