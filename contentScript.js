// Observer runs "addButton" function when it detects page changes.
// This allows the program to keep adding the description buttons after scrolling.
let observer = new MutationObserver(addButton);
let rateLimit = 2000;
let isLimited = false;

// Set all storage variables from chrome synced storage.
let apiSet = false;
chrome.storage.sync.get("apiKey", function(obj) {
	if (obj === "" || obj === undefined) return;
	apiSet = true;
});

let openText = "";
chrome.storage.sync.get("openText", function(obj) {
    openText = obj.openText;
    if (openText === undefined) {
        openText = "+";
    }
	document.addEventListener("onload", addButton());
	observer.observe(document.body, {childList: true, subtree: true});
});

let closeText = "";
chrome.storage.sync.get("closeText", function(obj) {
    closeText = obj.closeText;
    if (closeText === undefined) {
        closeText = "-";
    }
});

// Mapping from URLs to descriptions.
let URLtoDes = {};
// Mapping from URLs to button html elements.
let URLtoButton = {};
// List of video URLs on current page
let urls = [];
// List of video ids on current page. 
// The id is the end of the youtube link: Ex. https://www.youtube.com/watch?v=dQw4w9WgXcQ
let ids = [];

let numOfVids = 0;

// Given that the user provides their own api key this function will get a list of descriptions by accessing the 
// youtube api from background.js. 
function handleAPI() {
	let promises = [];
	let batches = [];
	// Can only have so many ids at once so they have to be done in batches
	if (ids.slice(numOfVids, ids.length).length > 30) {
		let numOfDiv = ids.slice(numOfVids, ids.length).length / 30;
		for (let x = 0; x < numOfDiv; x++) {
			let toAdd = ids.slice(numOfVids, numOfVids + 30);
			batches.push(ids.slice(numOfVids, numOfVids + toAdd.length));
			numOfVids += toAdd.length;
		}
        
	} else {
		batches.push(ids.slice(numOfVids, ids.length - 1));
    }
    
    // Removes timestamp from end of urls since it messes up the api call.
	for (let x = 0; x < batches.length; x++) {
		for (let i = 0; i < batches[x].length; i++) {
			batches[x][i] = cleanID(batches[x][i]);
		}
	}
    
    // Sends promise to background.js through chrome.runtime.sendMessage with urls to use for the api.
	for (let x = 0; x < batches.length; x++) {
		let promise = new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(
				{contentScriptQuery: "Des", videoIds: batches[x]},
				function(data) {
					if (typeof data === "undefined") {
						console.error("error getting video");
						resolve();
					} else if (data && data.error) {
						console.error("error getting video.");
						resolve();
					} else {
						for (let item of data.items) {
							addFullDes(item);
							resolve();
						}
					}
				});
		});
		promises.push(promise);
	}
    
	numOfVids = ids.length;
	return Promise.all(promises);
}

// Finds if the current page is running in dark or light mode to properly format elements.
function darkOrLight() {
	let dOrl = document.getElementsByTagName("html")[0];
	let dark = false;
	try {
		for (let x = 0; x < dOrl.attributes.length; x++) {
			if (dOrl.attributes[x].name === "dark") {
				dark = true;
			}
		}
          
	} catch (e) {
		console.log(e);
	}
	return dark; 
}

// Adds full description to the button element's parent from URLtoButton so it's ready when description is expanded.
function addFullDes(item) {
	let dark = darkOrLight();
	let id = item.id;
	let des = item.snippet.description;
	let links = Object.keys(URLtoButton);
	let linkIds = parseUrlIds(links);
	for (let x = 0; x < linkIds.length; x++) {
		if (cleanID(linkIds[x]) === id) {
            // Creating button to be added to button parent element.
            let expansionButton = document.createElement("button");
			expansionButton.innerText = "⇲";
			expansionButton.addEventListener("click", function(e) {
                // Closes description box when button is clicked on.
				if (this.childNodes.length > 1) {
					this.childNodes[1].remove();
					this.innerText = "⇲";
					return;
                } 
				let box = document.createElement("div");
				box.className = "popOutBox";
				box.id = "mydiv";
				let boxInner = document.createElement("p");
				boxInner.id = "mydivheader";
                box.appendChild(boxInner);
                
				boxInner.innerText = des;
				if (boxInner.innerText === "undefined") {
					boxInner.innerText = "Error retrieving description, please try again.";
				}
				if (!dark) {
					box.className += " light";
					expansionButton.className += " light";
					boxInner.className += "textlight";
				} else {
					boxInner.className += "textDark";
				}
				this.innerText = "⇱";
				this.appendChild(box);
				boxInner.addEventListener("click", function(e) {
					e.stopPropagation();
				});
                

            });
            // Add new button to parent of base popout button element.
            URLtoButton[links[x]].parentNode.appendChild(expansionButton);
            // Disable until ready.
			expansionButton.disabled = true;
			expansionButton.hidden = true;
			expansionButton.className = "expansionButton";
			break;
		}
        

	}

}

// Parses youtube video ids from full URL.
// Does not remove timestamp data.
function parseUrlIds(urls) {
	let searchTerm = "=";
    
	let id = [];
	for (let x = 0; x < urls.length; x++) {
		let toPush = urls[x].substring(urls[x].indexOf(searchTerm) + searchTerm.length, urls[x].length);
		if (toPush !== "") {
			id.push(toPush);
		}
	}
	return id;
}

// Returns true if urls changed.
// Used so addButton doesn't keep running if there is nothing to do.
function updateVideos() {
	let vidLinks = document.getElementsByClassName("style-scope");
	let tempURLs = [];
	for (let x = 0; x < vidLinks.length; x++) {
        if ((vidLinks[x].id === "video-title" || vidLinks[x].id === "video-title-link") && !urls.includes(vidLinks[x].href) 
            && !Object.keys(URLtoDes).includes(vidLinks[x].href)) {

			if (vidLinks[x].href !== undefined && vidLinks[x].href !== ""){
				tempURLs.push(vidLinks[x].href);
				getSourceAsDOM(vidLinks[x].href);
			}
		}
	}
    
	// Would be empty if there are no new urls
	if (tempURLs.length === 0) {
		return false;
	} else {
		urls = urls.concat(tempURLs);
		return true;
	}
}

// Removes timestamp from end of urls since it messes up the api call.
function cleanID(url) {
	let searchTerm = "=";
	let index = url.indexOf(searchTerm);
	let id = "";
	if (index === -1) {
		id = url;
	} else {
		id = url.substring(0, index - 2);
	}
	return id;
}

/* 
    This is needed to clear out old video values when user uses a "paperTab".
    "paperTab" is used when on a channel's youtube page and one of the banner selectors are used.
    This doesn't fully load a new page so the contentScript doesn't reset meaning the old descriptions and URLs still
    exist in global variables although they don't exist on the page.
*/
function tabUse() {
	URLtoDes = {};
	URLtoButton = {};
	urls = [];
	ids = [];
	numOfVids = 0;
}

// Adds button to expand description under videos.
function addButton() {
	if (isLimited) {
		return;
	}
	let paperTab = document.querySelectorAll("#tabsContent")[0];
	if (paperTab !== undefined) {
		const config = {attributes: true, childList: true, subtree: true};
		let obs = new MutationObserver(tabUse);
		obs.observe(paperTab, config);
	}
    
	// Testing for dark mode
	let dark = darkOrLight();
	// Will add new videos after the first wave 
	if (!updateVideos()) {
		return;
	}
    
	let channelNames = document.getElementsByClassName("style-scope");
	let currUrl = "";
    let parents = [];
    // Goes through all "style-scope" elements.
    // Records parents because some parents signify elements that cannot have a description added to them.
	for (let x = 0; x < channelNames.length; x++) {
		if (urls.includes(channelNames[x].href)) {
			currUrl = channelNames[x].href;
            foundURL = true;

            let id = parseUrlIds([currUrl]);
            if (!ids.includes(id)) {
                if (id === "") return;
                ids.push(id);
            }
		}
        
		parents.push(channelNames[x].className);
		if (channelNames[x].id === "metadata" && channelNames[x].className !== "style-scope ytd-browse" && urls.includes(currUrl)) {
			let home = false;
			let subs = false;
			let sidebar = false;
			// Test for home page
			if (parents.includes("style-scope ytd-rich-grid-media") && !parents.includes("grid style-scope ytd-rich-movie-renderer")) {
				home = true;
			}
			if (parents.includes("style-scope ytd-grid-video-renderer") && !home) {
				subs = true;
			}
			if (parents.includes("style-scope ytd-compact-video-renderer") && !home && !subs) {
				sidebar = true;
			}
			if (sidebar && !home && !subs) { continue; }
			if (!home && !subs && !sidebar) {
				parents = [];
				continue;
			}
            
			parents = [];
			let cont = false;
			for (let i = 0; i < channelNames[x].childNodes.length; i++) {
				if (channelNames[x].childNodes[i].id === "description-view") {
					if (URLtoButton[currUrl] === undefined) {
						URLtoButton[currUrl] = channelNames[x].childNodes[i];
					}
					cont = true;
					break;
				}
			}
			if (cont) continue;
            
			let button = document.createElement("button");
			button.innerText = openText;
			if (!dark) {
				button.className = "light";
			}
            
            
			button.id = "description-view";
			URLtoButton[currUrl] = channelNames[x].appendChild(button);
			button.addEventListener("click", function() {
				if (this.childNodes.length > 1) {
					this.childNodes[1].remove();
					this.innerText = openText;
					if (apiSet) {
						try {
							this.parentNode.getElementsByClassName("expansionButton")[0].disabled = true;
							this.parentNode.getElementsByClassName("expansionButton")[0].hidden = true;
						} catch(e) {
							console.error(e);
						}
                        
					}
					return;
				} 
				let box = document.createElement("a");
				box.className = "textBox";
				if (!dark) {
					box.className += " light";
				} else {
					box.className += " dark";
				}
				let buttonUrl = Object.keys(URLtoButton).find(key => URLtoButton[key] === this);
				box.innerText = URLtoDes[buttonUrl];
                
				if (subs) {
					box.style.maxWidth = "200px";
				} else {
					box.style.maxWidth = "290px";
				}
				if (box.innerText === "undefined") {
					box.innerText = "Error retrieving description, please try again.";
				}
				this.innerText = closeText;
				this.appendChild(box);
				try {
					let exBut = this.parentNode.getElementsByClassName("expansionButton")[0];
					if (!dark) {
						exBut.classList.add("light");
					}
					this.parentNode.getElementsByClassName("expansionButton")[0].disabled = false;
					this.parentNode.getElementsByClassName("expansionButton")[0].hidden = false;
				} catch (e) {
					console.log(e);
				}
                
			});
            
		}
	}
	isLimited = true;
	setTimeout(function() {
		isLimited = false;
	}, rateLimit);
	handleAPI();
}

// Gets the DOM from a url. This is used to get the mini description preview from the meta tag.
// Urls here contain timestamps since removing them makes the timestamp dissapear for the user as this is a 
// request to the video so progress is reset withough the timestamp section of the url.
// Would be slow although full page doesn't load from these requests, only meta tags and some skeleton html.
function getSourceAsDOM(url)
{
	let xhr = new XMLHttpRequest();
	if (url === undefined) {
		return;
	}
	xhr.open("GET",url,true);
	let parser = new DOMParser();
	xhr.onload = function(e) {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				readNewDom(parser.parseFromString(xhr.responseText,"text/html"), xhr.responseURL);
			} else {
				console.error(xhr.statusText);
				console.log("Couldn't read " + url);
			}
		} 
	};
	xhr.send();
    
       
}

// Pulls the description from page when it's done loading
// Adds to the url to description object 
function readNewDom(dom, url) {
	try {

		URLtoDes[url] = dom.querySelectorAll("meta[property=\"og:description\"]")[0].content;

	} catch (e) {
		console.error(e, [url]);
	}
    
    
}
