"use strict";

var _ = require("lodash");
var debug = require("debug")("collection-json");

function plugin(options) {
  options = normalize(options);

  return function(files, metalsmith, done) {
    var processedCollections = metalsmith.metadata().collections;

    // Generate paginated output for each category
    _.each(processedCollections, function(processedCollection) {
      debug("Processing collection %s", processedCollection.id);
      var collectionOptions =  _.findWhere(options.collectionConfig.collections, {id: processedCollection.id});
      if (!_.isObject(collectionOptions)) {
        collectionOptions = {backend: {}};
      }
      collectionOptions = _.merge({}, options.collectionConfig.backend.defaultCollectionConfig, collectionOptions.backend);

      traverseCollectionCategoriesDeep(processedCollection, function(processedCollectionCategory) {
        debug("Processing category %s:%s", processedCollection.id, processedCollectionCategory.id);
        var currentPost = 0;
        _.each(processedCollectionCategory.$paginatedOwnPosts, function(ownPostPage, idx) {
          debug("Processing category page %s:%s:%s", processedCollection.id, processedCollectionCategory.id, idx);
          var finalJson = {
            pagination: {
              hasNext: idx + 1 !== processedCollectionCategory.$paginatedOwnPosts.length,
              hasPrevious: currentPost > 0,
              total: processedCollectionCategory.stats.ownContentCount,
              current: currentPost
            },
            contents: generatePosts(ownPostPage)
          };
          currentPost += ownPostPage.length;

          var fileName = collectionOptions.dest
                              .replace(":collectionId", processedCollection.id)
                              .replace(":categoryUrl", processedCollectionCategory.url)
                              .replace(":page", idx);

          files[fileName] = {
            contents: new Buffer(JSON.stringify(finalJson))
          };
        });
      });
    });

    // Generate category index
    var json = {
      config: options.frontendConfig,
      collections: recursiveCleanPrivateFields(processedCollections)
    };
    files[options.collectionConfig.backend.categoryIndex] = {
      contents: new Buffer(JSON.stringify(json))
    };

    done();
  };
}

function recursiveCleanPrivateFields(something) {
  if (_.isPlainObject(something)) {
    var result = {};
    _.each(something, function (v, k) {
      if (!_.startsWith(k, "$")) {
        result[k] = recursiveCleanPrivateFields(v);
      }
    });
    return result;
  }

  if (_.isArray(something)) {
    return _.map(something, function (e) {
      return recursiveCleanPrivateFields(e);
    });
  }

  return _.clone(something);
}

function generatePosts(postArray) {
  return _.map(postArray, function(post) {
    return {
      id: post.$groupId,
      url: post.$groupUrl,
      name: post.title,
      excerpt: post.excerpt,
      config: {
        readingTime: post.readingTime,
        wordCount: post.wordCount
      },
      collections: post.$collections
    };
  });
}

function traverseCollectionCategoriesDeep(categoryOrCollection, fn) {
  debug("Deep traversing %s", categoryOrCollection.id);
  _.each(categoryOrCollection.categories, function(category) {
    traverseCollectionCategoriesDeep(category, fn);
    fn(category);
  });
}

function normalize(options) {
  var defaults = {
    collectionConfig: {
      backend: {
        categoryIndex: "index.json",
        defaultCollectionConfig: {
          dest: ":collectionId/:categoryId/:page.json"
        }
      },
      collections: []
    },
    frontendConfig: {}
  };
  options = _.merge({}, defaults, options);

  return options;
}

module.exports = plugin;
