var Metalsmith 		       = require('metalsmith'),
		collections          = require('./plugins/ub-collections'),
		patternMove          = require('./plugins/pattern-move'),
		markdown             = require('metalsmith-markdown'),
		templates            = require('metalsmith-templates'),
		ignore               = require('metalsmith-ignore'),
		url                  = require('./plugins/metalsmith-page-url'),
		slug                 = require('metalsmith-slug'),
		title 			         = require('metalsmith-title'),
	  saveOriginalLocation = require('./plugins/save-original-location'),
		supportRho     			 = require('./plugins/rho'),
	  rhoSteroid					 = require('./plugins/rho-on-steroids'),
		path   				       = require('path'),
		define							 = require('metalsmith-define'),
		S 									 = require('string'),
		_										 = require('underscore'),
		fs									 = require('fs'),
		check 							 = require('check-types');
		//excerpts       = require('metalsmith-excerpts'),
		//atom           = require('metalsmith-atom'),

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



var tinylr = require('tiny-lr');
var lrserver = tinylr();
lrserver.listen(35729, function(err) {
	if (err) { return console.log(err); }
});


require('chokidar').watch(path.join(__dirname, 'src'), {
	ignored: /[\/\\]\./,
	ignoreInitial: true
}).on('all', _.debounce(function(event, path) {
	console.log(event, path);
	msAction();
	console.log("trigger reload")
	lrserver.changed({body:{files:path}});
}, 500));
msAction();
function msAction() {
	var tbProcessedImagesGlobal = {};
	Metalsmith(__dirname)
		.source('src')
		.destination('build')
		.use(ignore([
			'templates/**/*'
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
				}],
			collections: {
				all: {
					filterFn: function () {
						return "all";
					},
					sortBy: 'date',
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
					filterFn: function (data) {
						return data.date.getYear() + " - " + data.date.getMonth();
					},
					sortBy: 'date',
					reverse: true,
					templates: [{
						file: "date.jade",
						permalink: "date/:collectionItem/:page/index.html",
						fistPagePermalink: "date/:collectionItem/index.html"
					}, {
						file: "rss.jade",
						fistPagePermalink: "date/:collectionItem.rss",
						pageLimit: 1
					}]
				},
				category: {
					sortBy: 'date',
					reverse: true
				},
				place: {
					sortBy: 'date',
					reverse: true
				},
				people: {
					sortBy: 'date',
					reverse: true
				}
			}
		}))
		//.use(excerpts())
		.use(slug({
			patterns: ['*.md'],
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
				return S(file).between(groupId).chompLeft(path.sep).s;
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

				return (extension == ".md" && directoryOfFile.split(path.sep).length <= 3)
			}
		}))
		.use(supportRho({
			BlockCompiler: function (file, data) {
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
					var surl = S(url);
					return !(surl.contains("://") || surl.startsWith("//"));
				}

			}
		}))
		//.use(markdown({
		//	highlight: function (code) {
		//		return require('highlight.js').highlightAuto(code).value;
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
						data.contents = new Buffer(S(data.contents.toString()).replaceAll(generateParseLater(url, "url"), renderedA).s);
					});

					// normalize tb processed image list and append it to global list
					_.each(data.$tbProcessedImages, function (imgDetail, src) {
						var normalizedSrc = normalizeUrl(data, src);

						globalTbProcessedImageList[normalizedSrc] = globalTbProcessedImageList[normalizedSrc] || [];
						globalTbProcessedImageList[normalizedSrc] = _.union(globalTbProcessedImageList[normalizedSrc], imgDetail.flags);

						var renderedImg = renderImg(imgDetail.alt, normalizedSrc, imgDetail.flags);
						data.contents = new Buffer(S(data.contents.toString()).replaceAll(generateParseLater(src, "image"), renderedImg).s);
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
					if (!S(tbNormalizedUrl).startsWith("/")) {
						tbNormalizedUrl = S(file.$groupUrl).ensureRight("/").s + S(tbNormalizedUrl).chompLeft("/").s;
					}

					return tbNormalizedUrl;
				}

				function resolveIdReference(urlWithMaybeReference) {
					var reference;
					var isFullReference = false;
					var surlWithMaybeReference = S(urlWithMaybeReference);
					reference = surlWithMaybeReference.between("@", "/").s;
					if (reference.length == 0 && surlWithMaybeReference.contains("@")) {
						reference = urlWithMaybeReference.substr(urlWithMaybeReference.indexOf("@") + 1);
						isFullReference = true;
					}
					if (reference.length == 0) {
						return urlWithMaybeReference; // no ref found
					}

					var normalizedUrl;
					var groupMaster = _.where(files, {$groupId: reference, $groupMaster: true});
					if (groupMaster.length != 1) {
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
			}
		})(tbProcessedImagesGlobal))
		.use(define({
			/* Assign global template related vars */
			$template: {
				assets: "/assets"
			}
		}))
		.use(templates({
			engine: 'jade',
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
		console.log("after build")

	function renderImg(alt, src, flags) {
		return "<img src=\"" + src + "\" alt=\"" + alt + "\" class=\"" + S(_.reduce(flags, function (prev, cur) {
				return prev + " " + cur;
			}, "")).trim().s + "\">";
	}

	function renderA(text, href, flags) {
		return "<a href=\"" + href + "\" class=\"" + S(_.reduce(flags, function (prev, cur) {
				return prev + " " + cur;
			}, "")).trim().s + "\"" + (_.contains(flags, "blank") ? "target=\"_blank\"" : "") + ">" + text + "</a>";
	}

	function generateParseLater(thing, type) {
		var PARSE_LATER_START = "__PARSE_LATER_START[";
		var PARSE_LATER_SEPERATOR = "||";
		var PARSE_LATER_END = "]END_LATER_PARSE";

		return PARSE_LATER_START + thing + PARSE_LATER_SEPERATOR + type + PARSE_LATER_END
	}
}

