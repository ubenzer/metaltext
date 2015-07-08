"use strict";

var s = require("string");
var _	= require("lodash");
var rhoSteroid = require("rho-on-steroids");

var rhoRenderHelpers = {
  renderImg: renderImg,
  renderA: renderA,
  getBlockCompilerOnSteroids: getBlockCompilerOnSteroids
};

module.exports = rhoRenderHelpers;

function getBlockCompilerOnSteroids(opts) {
  opts = normalize(opts);

  return function blockCompilerOnSteroids(files, file, data) {
    return rhoSteroid(
      {
        renderImg: function(escapedAlt, src, flags) {
          if (checkOwnUrl(src)) {
            data.$tbProcessedImages = data.$tbProcessedImages || [];
            data.$tbProcessedImages.push({
              src: src,
              flags: flags,
              alt: escapedAlt
            });
            src = normalizeUrl(src).normalizedUrl;
          }
          return renderImg(escapedAlt, src, flags);
        },
        renderA: function(text, url, flags) {
          if (checkOwnUrl(url)) {
            var normalizeReport = normalizeUrl(url);
            if (normalizeReport.idOnly) {
              return renderInternalA(text, normalizeReport.normalizedUrl, flags);
            }

            return renderA(text, normalizeReport.normalizedUrl, flags);
          }
          return renderA(text, url, flags);
        }
      }
    );

    function checkOwnUrl(url) {
      var surl = s(url);
      return !(surl.contains("://") || surl.startsWith("//"));
    }

    function normalizeUrl(urlWithReference) {
      var surlWithReference = s(urlWithReference);
      var atCount = surlWithReference.count("@");
      if (atCount === 1 || atCount > 2) {
        throw new Error("Can't parse id identifiers: " + urlWithReference);
      }

      if (atCount === 0) {
        surlWithReference = surlWithReference.ensureLeft("/").ensureLeft("@" + data.$groupId + "@");
      }

      var reference = surlWithReference.between("@", "@").s;
      var isOnlyReference = reference.length + 2 === urlWithReference.length;

      var groupMaster = _.where(files, {$groupId: reference, $groupMaster: true});
      if (groupMaster.length !== 1) {
        throw new Error("Couldn't find group master for id " + reference + " in file " + file);
      }
      groupMaster = groupMaster[0];

      if (isOnlyReference) {
        return {
          idOnly: true,
          normalizedUrl: groupMaster.$groupId
        };
      }

      var normalizedUrl = (s(opts.staticFilePrefix).ensureRight("/").s) + (surlWithReference.replaceAll("@" + reference + "@", groupMaster.$groupUrl)).s;

      return {
        idOnly: false,
        normalizedUrl: normalizedUrl
      };
    }
  };

  function normalize(options) {
    var defaults = {
      staticFilePrefix: ""
    };
    options = _.merge({}, defaults, options);

    return options;
  }
}

function renderImg(alt, src, flags) {
  return "<img src=\"" + src + "\" alt=\"" + alt + "\" class=\"" + s(_.reduce(flags, function(prev, cur) {
      return prev + " " + cur;
    }, "")).trim().s + "\">";
}

function renderA(text, href, flags) {
  return "<a href=\"" + href + "\" class=\"" + s(_.reduce(flags, function(prev, cur) {
      return prev + " " + cur;
    }, "")).trim().s + "\"" + (_.contains(flags, "blank") ? "target=\"_blank\"" : "") + ">" + text + "</a>";
}

function renderInternalA(text, id, flags) {
  return "<a mtx-href=\"" + id + "\" class=\"" + s(_.reduce(flags, function(prev, cur) {
      return prev + " " + cur;
    }, "")).trim().s + "\"" + ">" + text + "</a>";
}
