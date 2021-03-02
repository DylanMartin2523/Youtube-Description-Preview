"use strict";

chrome.storage.sync.get(["openText"], function(obj) {
	if (obj === undefined) {
		chrome.storage.sync.set({"openText": "+"}, function() {});
		chrome.storage.sync.set({"closeText": "-"}, function() {});
	}
});

chrome.storage.sync.get(["closeText"], function(obj) {
	if (obj === undefined) {
		chrome.storage.sync.set({"openText": "+"}, function() {});
		chrome.storage.sync.set({"closeText": "-"}, function() {});
	}
});
  


let apiKey = "";
chrome.storage.sync.get("apiKey", function(obj) {
	if (obj === undefined) {
		chrome.storage.sync.set({"apiKey": ""}, function() {});
	} else {
		apiKey = obj.apiKey;
	}
});

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [new chrome.declarativeContent.PageStateMatcher({
				pageUrl: {hostEquals: "www.youtube.com"},
			})],
			actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
});


chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    if (message.contentScriptQuery === "Des") {
      let combined_data = {"items": []};
      let promises = [];

      if (apiKey !== undefined && apiKey.length) {
        let url = "https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=" +
            message.videoIds + "&key=" + apiKey;
        fetch(url)
          .then(response => response.json())
          .then(data => sendResponse(data));
        return true;  // Will respond asynchronously with `sendResponse()`.
      } else {
        return false;
      }
    } else if (message.contentScriptQuery === "apiKey") {
      youtubeApiKey = message.apiKey;
    }
  });

