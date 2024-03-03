// Observer runs "addButton" function when it detects page changes.
// This allows the program to keep adding the description buttons after scrolling.
let observer = new MutationObserver(addButton);
let rateLimit = 2000;
let isLimited = false;

// Set all storage variables from chrome synced storage.
let apiSet = false;
chrome.storage.sync.get("apiKey", function (obj) {
	if (obj === "" || obj === undefined) return;
	apiSet = true;
});

let openText = "";
chrome.storage.sync.get("openText", function (obj) {
	openText = obj.openText;
	if (openText === undefined) {
		openText = "+";
	}
	document.addEventListener("onload", addButton());
	observer.observe(document.body, { childList: true, subtree: true });
});

let closeText = "";
chrome.storage.sync.get("closeText", function (obj) {
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

let IdToFullDes = {};

let numOfVids = 0;

let ret_error = false

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
		batches.push(ids.slice(numOfVids, ids.length));
	}

	// Removes timestamp from end of urls since it messes up the api call.
	for (let x = 0; x < batches.length; x++) {
		for (let i = 0; i < batches[x].length; i++) {
			batches[x][i] = cleanID(batches[x][i]);
			URLtoDes["https://www.youtube.com/watch?v=" + batches[x][i]] = "Error retrieving description, please try again."
		}
	}

	// Sends promise to background.js through chrome.runtime.sendMessage with urls to use for the api.
	for (let x = 0; x < batches.length; x++) {
		k = batches[x]
		let promise = new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(
				{ contentScriptQuery: "Des", videoIds: k },
				function (data) {
					if (typeof data === "undefined") {
						console.error("error getting video");
						resolve();
					} else if (data && data.error) {
						console.error("error getting video.");
						resolve();
					} else {
						toRet = data
						for (let item of data.items) {
							let end = item.snippet.description.length > 160 ? 160 : item.snippet.description.length
							let des = end == 160 ? item.snippet.description.substring(0, end) + " ..." : item.snippet.description
							URLtoDes["https://www.youtube.com/watch?v=" + item.id] = des
							addItemDes(item);
							resolve();
						}
					}
				});
		});
		promises.push(promise);
		setTimeout(function () {
		}, rateLimit);
		
	}

	numOfVids = ids.length;
	return true
}

async function process_batchs(batches) {
	let promises = [];
	for (let x = 0; x < batches.length; x++) {
		k = batches[x]
		let promise = new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(
				{ contentScriptQuery: "Des", videoIds: k },
				function (data) {
					if (typeof data === "undefined") {
						console.error("error getting video");
						resolve();
					} else if (data && data.error) {
						console.error("error getting video.");
						resolve();
					} else {
						toRet = data
						for (let item of data.items) {
							let end = item.snippet.description.length > 160 ? 160 : item.snippet.description.length
							let des = end == 160 ? item.snippet.description.substring(0, end) + " ..." : item.snippet.description
							URLtoDes["https://www.youtube.com/watch?v=" + item.id] = des
							addItemDes(item);
							resolve();
						}
					}
				});
		});
		promises.push(promise);
	}
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

function dragElement(elmnt, toMove) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	elmnt.onmousedown = dragMouseDown;

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		if (!parseFloat(toMove.style.height) == 0.0) {
			elmnt.style.top = (parseInt(toMove.closest('#details, #details-sidebar').offsetHeight) - 13) + 'px'
			// if (elmnt.offsetTop - pos2 <= 225) {
			// 	elmnt.style.top = 225;
			// } else { 
			// 	elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
			// }
		}

		toMove.style.height = parseFloat(toMove.style.height) - pos2 + "px";
	}

	function closeDragElement() {
		/* stop moving when mouse button is released:*/
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
	return template.content.firstChild;
}

function addItemDes(item) {
	addFullDes(item.id, item.snippet.description)
}

// Adds full description to the button element's parent from URLtoButton so it's ready when description is expanded.
function addFullDes(id, des) {
	let dark = darkOrLight();
	// let id = item.id;
	// let des = item.snippet.description;
	IdToFullDes[id] = des
	let links = Object.keys(URLtoButton);
	let linkIds = parseUrlIds(links);
	for (let x = 0; x < linkIds.length; x++) {
		if (linkIds[x] === undefined) {
			console.log("BAD LINK " + x)
		}
		if (cleanID(linkIds[x]) === id) {
			// Creating button to be added to button parent element.
			let expansionDiv = document.createElement("div")
			expansionDiv.style.display = "flex";
			expansionDiv.style.flexDirection = "column";
			let expansionButton = document.createElement("button");
			expansionDiv.appendChild(expansionButton)
			expansionButton.innerText = "⇲";
			expansionButton.className = "expansionButton dp-button";
			expansionButton.addEventListener("click", function (e) {
				// Closes description box when button is clicked on.
				if (this.childNodes.length > 1) {
					this.closest("#details, #details-sidebar").querySelector("#drag-button-dp").remove()
					this.childNodes[1].remove();
					this.innerText = "⇲";
					return;
				}

				let deets = this.closest("#details, #details-sidebar")
				deets.style.overflowY = "auto";
				deets.style.overflowX = "hidden";
				deets.style.overflowWrap = "anywhere";
				deets.appendChild(htmlToElement('<style id="sb_style">#details::-webkit-scrollbar{width:1px;height:11px;background-color:\
						#f4f4f4;}#details::-webkit-scrollbar-button{}#details::-webkit-scrollbar-track{border-radius:0px;-webkit-box-shad\
						ow:inset 0 0 6px rgba(0,0,0,0.3);background-color:#f4f4f4;}#details::-webkit-scrollbar-track-piece{}#details::-we\
						bkit-scrollbar-thumb{border-radius:0px;background:#000;border:0px solid #666;}#details::-webkit-scrollbar-corner{\
						}#details::-webkit-scrollbar-resizer{}</style>'))
				deets.appendChild(htmlToElement('<style id="sb_style">#details-sidebar::-webkit-scrollbar{width:1px;height:11px;background-color:\
					#f4f4f4;}#details-sidebar::-webkit-scrollbar-button{}#details-sidebar::-webkit-scrollbar-track{border-radius:0px;-webkit-box-shad\
					ow:inset 0 0 6px rgba(0,0,0,0.3);background-color:#f4f4f4;}#details-sidebar::-webkit-scrollbar-track-piece{}#details-sidebar::-we\
					bkit-scrollbar-thumb{border-radius:0px;background:#000;border:0px solid #666;}#details-sidebar::-webkit-scrollbar-corner{\
					}#details-sidebar::-webkit-scrollbar-resizer{}</style>'))

				let box = document.createElement("div");
				box.className = "popOutBox";
				box.id = "mydiv";
				let boxInner = document.createElement("p");
				boxInner.id = "mydivheader";
				box.appendChild(boxInner);
				boxInner.style.maxWidth = deets.offsetWidth - 2 + "px"
				boxInner.style.position = 'relative';
				boxInner.style.height = "0";
				boxInner.style.padding = '0px';

				boxInner.innerText = des;
				if (boxInner.innerText === "undefined") {
					boxInner.innerText = "Error retrieving description, please try again.";
					ret_error = true;
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
				boxInner.addEventListener("click", function (e) {
					e.stopPropagation();
				});

				dragButton = document.createElement("a")
				dragButton.id = "drag-button-dp"
				dragButton.style.cursor = "n-resize"
				dragButton.style.position = "absolute"
				dragButton.style.bottom = "0"
				dragButton.style.right = "0"
				dragButton.innerText = "↕"
				dragButton.style.color = 'white'
				dragButton.style.overflowX = 'hidden'
				dragButton.style.overflowY = 'hidden'
				dragButton.style.marginRight = '5px'
				dragButton.addEventListener("mouseup", function (e) {
					e.stopPropagation();
				});

				deets.appendChild(dragButton)
				dragButton.style.zIndex = 1000
				dragElement(dragButton, this.querySelector("#mydivheader"))
			});
			let deets = URLtoButton[links[x]].parentNode.closest("#details, #details-sidebar")
			// Add new button to parent of base popout button element.
			if (deets != null && deets.id === 'details-sidebar'){
				URLtoButton[links[x]].parentNode.prepend(expansionDiv);
			} else if (deets != null) {
				URLtoButton[links[x]].parentNode.appendChild(expansionDiv);
			}
			
			// Disable until ready.
			expansionButton.disabled = true;
			expansionButton.hidden = true;
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
			id.push(toPush.replace("&pp=sAQA", ""));
		}

	}
	return id;
}

// Returns true if urls changed.
// Used so addButton doesn't keep running if there is nothing to do.
function updateVideos() {
	let vidLinks = document.getElementsByClassName("yt-simple-endpoint");
	let tempURLs = [];
	for (let x = 0; x < vidLinks.length; x++) {
		if ((vidLinks[x].id === "video-title" || vidLinks[x].id === "video-title-link" || vidLinks[x].className === "yt-simple-endpoint style-scope ytd-compact-video-renderer") && !urls.includes(vidLinks[x].href)
			&& !Object.keys(URLtoDes).includes(vidLinks[x].href)) {

				if (vidLinks[x].href === undefined) {
					continue;
				}

				if (Object.keys(URLtoButton).includes(vidLinks[x].href)) {
					continue;
				}

				if (vidLinks[x].href.includes("shorts")) {
					continue;
				}

			if (vidLinks[x].href !== undefined && vidLinks[x].href !== "") {
				tempURLs.push(vidLinks[x].href);
				let id = parseUrlIds([vidLinks[x].href]);
				if (!ids.includes(id[0])) {
					if (id === "") return;
					ids.push(id[0]);
				}
				if (!apiSet) {
					getSourceAsDOM(vidLinks[x].href);
				}

			}
		}
	}

	// Would be empty if there are no new urls
	if (tempURLs.length === 0) {
		return false;
	} else if (ret_error) {
		ret_error = false
		return true;
	} else {
		urls = urls.concat(tempURLs);
		if (apiSet) {
			return handleAPI()
		}
		// return true;
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

// Removes timestamp from full url so it works well with the 
function cleanURL(url) {
	let searchTerm = "=";
	let index1 = url.indexOf(searchTerm);
	let newUrl = url.substring(index1 + 1)
	let index2 = newUrl.indexOf(searchTerm);
	let id = "";
	if (index2 === -1) {
		id = url;
	} else {
		id = url.substring(0, index1 + index2 - 1);
	}
	return id.replace("&pp=sAQA", "");
}

/* 
	This is needed to clear out old video values when user uses a "paperTab".
	"paperTab" is used when on a channel's youtube page and one of the banner selectors are used.
	This doesn't fully load a new page so the contentScript doesn't reset meaning the old descriptions and URLs still
	exist in global variables although they don't exist on the page.
*/
function tabUse() {
	// URLtoDes = {};
	// URLtoButton = {};
	// urls = [];
	// ids = [];
	numOfVids = 0;
}

// Adds button to expand description under videos.
function addButton() {
	if (isLimited) {
		setTimeout(function () {
			isLimited = false;
		}, rateLimit);
	}
	let paperTab = document.querySelectorAll("#tabsContent")[0];
	if (paperTab !== undefined) {
		const config = { attributes: true, childList: true, subtree: true };
		let obs = new MutationObserver(tabUse);
		obs.observe(paperTab, config);
	}

	// Testing for dark mode
	let dark = darkOrLight();
	// Will add new videos after the first wave 
	if (!updateVideos()) {
		return;
	}

	process_batchs(parseUrlIds(ids))

	let channelNames = document.getElementsByClassName("style-scope");
	// let channelNames = document.getElementsByClassName("ytd-rich-grid-media");
	let currUrl = "";
	let parents = [];
	let parentElements = [];
	// Goes through all "style-scope" elements.
	// Records parents because some parents signify elements that cannot have a description added to them.
	for (let x = 0; x < channelNames.length; x++) {
		if (Object.keys(URLtoButton).includes(channelNames[x].href)) {
			continue;
		}

		if (urls.includes(channelNames[x].href)) {
			currUrl = channelNames[x].href;
			foundURL = true;

			let id = parseUrlIds([currUrl]);
			if (!ids.includes(id[0])) {
				if (id === "") return;
				ids.push(id[0]);
			}
		}

		parents.push(channelNames[x].className);
		parentElements.push(channelNames[x])

		let buttonExists = false
		if (channelNames[x].id === "metadata" && urls.includes(currUrl)) {
			for (child in channelNames[x].childNodes.values()) {
				if (child.id === "dpButtonDiv") {
					buttonExists = true
				}
			}

			if (buttonExists) {
				continue;
			}

			let home = false;
			let subs = false;
			let sidebar = false;
			let movie = false;
			let sb = false;
			let notNeeded = false;
			// Test for home page
			if ((parents.includes("style-scope ytd-rich-grid-media") || parents.includes('details style-scope ytd-compact-video-renderer')) && !parents.includes("grid style-scope ytd-rich-movie-renderer")) {
				home = true;
			}
			if (parents.includes('details style-scope ytd-compact-video-renderer') && !parents.includes("grid style-scope ytd-rich-movie-renderer")) {
				sidebar = true;
			}
			if (parents.includes("style-scope ytd-grid-video-renderer") && !home) {
				subs = true;
			}
			// if (parents.includes("style-scope ytd-compact-video-renderer") && !home && !subs) {
			// 	sidebar = true;
			// }
			if (parents.includes("style-scope ytd-rich-grid-movie")) {
				movie = true;
			} if (parents.includes("style-scope ytd-searchbox")) {
				sb = true;
			} if (parents.includes("style-scope ytd-expanded-shelf-contents-renderer")) {
				notNeeded = true;
			}
			if (notNeeded) { continue; }
			if ((movie || sb) && !home && !subs) { continue; }
			if (!home && !subs) {
				parents = [];
				continue;
			}

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

			let dpButtonDiv = document.createElement("div");
			dpButtonDiv.style.display = "flex";
			if (sidebar) {
				dpButtonDiv.style.flexDirection = "column-reverse";
				dpButtonDiv.style.alignItems = "flex-start";
			} else {
				dpButtonDiv.style.flexDirection = "column";
			}
			
			dpButtonDiv.class = "dpButtonDiv"
			let button = document.createElement("button");
			dpButtonDiv.appendChild(button)
			button.className = "dp-button"
			button.innerText = openText;
			if (!dark) {
				button.className = "light";
			}

			button.id = "description-view";
			// channelNames[x].appendChild(button)
			if (Object.keys(URLtoDes).includes(cleanURL(currUrl))) {
				if (sidebar) {
					parentDiv = channelNames[x].querySelector("div").closest(".style-scope ytd-compact-video-renderer")
					parentDiv.appendChild(dpButtonDiv);
					parentDiv.style.flexWrap = "wrap";
					parentDiv.id = "details-sidebar";
				} else {
					channelNames[x].appendChild(dpButtonDiv);
				}
			}
			URLtoButton[currUrl] = button;
			button.addEventListener("click", processButtonPress);
			button.dark = dark;
			button.subs = subs;
			button.sidebar = sidebar;
		}
	}
	isLimited = true;
	setTimeout(function () {
		isLimited = false;
	}, rateLimit);

}

// Gets the DOM from a url. This is used to get the mini description preview from the meta tag.
// Urls here contain timestamps since removing them makes the timestamp dissapear for the user as this is a 
// request to the video so progress is reset without the timestamp section of the url.
// Would be slow although full page doesn't load from these requests, only meta tags and some skeleton html.
function getSourceAsDOM(url) {
	fetch(url).then(function (response) {
		return response.text();
	}).then(function (html) {
		readNewDom(html, url);
	}).catch(function (err) {
		console.warn('Something went wrong.', err);
	});


}

// Pulls the description from page when it's done loading
// Adds to the url to description object 
function readNewDom(dom, url) {
	try {
		var doc = new DOMParser().parseFromString(dom, "text/html");
		URLtoDes[url] = doc.querySelectorAll("meta[property=\"og:description\"]")[0].content;
	} catch (e) {
		console.error(e, [url]);
	}


}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function demo() {
	console.log('Taking a break...');
	await sleep(2000);
	console.log('Two second later');
  }

async function processButtonPress(evt, passedObj=undefined, eventTarget=undefined) {
	if (passedObj !== undefined) {
		parentObj = passedObj 
	} else {
		parentObj = this
	}


	if (eventTarget !== undefined && evt.currentTarget === undefined) {
		evt.currentTarget = eventTarget 
	}
	
	evt.cancelBubble = true;
    if (evt.stopPropagation) {
		evt.stopPropagation();
	}
	if (passedObj === undefined && parentObj.childNodes.length > 1) {
		parentObj.childNodes[1].remove();
		parentObj.innerText = openText;
		if (apiSet) {
			try {
				parentObj.parentNode.getElementsByClassName("expansionButton")[0].disabled = true;
				parentObj.parentNode.getElementsByClassName("expansionButton")[0].hidden = true;
			} catch (e) {
				console.error(e);
			}

			try {
				parentObj.closest("#details, #details-sidebar").querySelector("#drag-button-dp").hidden = true;
				parentObj.closest("#details, #details-sidebar").querySelector("#drag-button-dp").disabled = true;
			} catch (e) {
				console.error(e);
			}

		}
		return;
	}
	let box = document.createElement("a");
	box.className = "textBox";
	if (evt.currentTarget !== null && !evt.currentTarget.dark) {
		box.className += " light";
	} else if (evt.currentTarget !== null){
		box.className += " dark";
	}

	let buttonUrl = Object.keys(URLtoButton).find(key => URLtoButton[key] === parentObj);
	if (buttonUrl !== undefined) {
		box.innerText = URLtoDes[cleanURL(buttonUrl)];
	}

	if (evt.currentTarget !== null && evt.currentTarget.subs) {
		box.style.maxWidth = "200px";
	} else {
		box.style.maxWidth = "290px";
	}
	if (box.innerText === "undefined") {
		box.innerText = "Error retrieving description.";
		dpButtonDiv.remove
	}
	if (box.innerText === "Error retrieving description, please try again.") {
		await process_batchs(parseUrlIds(ids))
		box.innerText = "Loading description...";
		// dpButtonDiv.remove
		parentObj.innerText = closeText;
		parentObj.appendChild(box);
		while (URLtoDes[cleanURL(buttonUrl)] === "Error retrieving description, please try again.") {
			box.innerText = "Loading description..";
			await sleep(500)
			box.innerText = "Loading description.";
			await sleep(500)
			box.innerText = "Loading description..";
			await sleep(500)
			box.innerText = "Loading description...";
		}
		processButtonPress(evt, passedObj=this, eventTarget=evt.currentTarget)
		return
	}
	parentObj.innerText = closeText;
	parentObj.appendChild(box);
	try {
		let exBut = parentObj.parentNode.getElementsByClassName("expansionButton")[0];
		if (evt.currentTarget !== null && !evt.currentTarget.dark) {
			exBut.classList.add("light");
		}
		parentObj.parentNode.getElementsByClassName("expansionButton")[0].disabled = false;
		parentObj.parentNode.getElementsByClassName("expansionButton")[0].hidden = false;
		parentObj.closest("#details, #details-sidebar").querySelector("#drag-button-dp").hidden = false;
		parentObj.closest("#details, #details-sidebar").querySelector("#drag-button-dp").disabled = false;
	} catch (e) {
		console.error(e);
	}
}
