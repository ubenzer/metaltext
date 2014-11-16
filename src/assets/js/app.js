(function() {
  "use strict";

  var $header = $("header").first();
  var $navbar = $("nav.navbar").first();

  var headerHeight = $header.height();

  $(window).scroll(function() {
    // touchmove
    if ($(document).scrollTop() > headerHeight - 51) {
      $header.addClass("small-header");
      $navbar.addClass("small-navbar");
    } else {
      $header.removeClass("small-header");
      $navbar.removeClass("small-navbar");
    }
  });

  $(document).ready(function() {
    $("#main-navigation").mmenu({
      searchfield: {
        add: true,
        search: true,
        placeholder: "Search",
        noResults: "No results found."
      }
    }, {
    });
  });

  $(window).triggerHandler("scroll");
})();
