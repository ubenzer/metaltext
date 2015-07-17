"use strict";
var path = require("path");

module.exports = {
  build: {
    source: path.join(process.cwd(), "src"),
    destination: path.join(process.cwd(), "build", "data"),
    feSource: "https://github.com/ubenzer/metaltext-fe/archive/release/bleeding-edge.zip",
    feDestination: path.join(process.cwd(), "build"),
    domain: null, // CNAME www.ubenzer.com
    travis: {
      privateKeyFile: null,
      targetRepository: null
    }
  },

  frontend: {
    sidenav: {
      title: "Navigation"
    },
    common: {
      name: "Your Site Title",
      allPostsTitle: "All Posts"
    }
  },

  collections: {
    backend: {
      src: "single/**/*.html",
      categoryIndex: "index.json",
      defaultCollectionConfig: {
        pagination: 2,
        postSorting: {
          sortBy: "date",
          reverse: true
        },
        dest: "index/:collectionId/:categoryUrl/:page.json"
      },
      subCollectionSeperator: "/"
    },
    frontend: {
      hideFromNavigation: false,
      alwaysOpenInNavigation: false
    },
    collections: [
      {
        id: "all",
        backend: {
          filterFn: function() { return "all"; },
          dest: "all/:page.json"
        }
      },
      {
        id: "category",
        frontend: {
          name: "Categories",
          alwaysOpenInNavigation: true
        }
      },
      {
        id: "date",
        backend: {
          // Used for auto generating categories
          filterFn: function(data) {
            return data.date.getYear() + " - " + data.date.getMonth();
          }
        },
        frontend: {
          name: "Date Archive"
        }
      }
    ]
  }
};
