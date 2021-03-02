let openText = document.getElementById("openText");
let closeText = document.getElementById("closeText");

let openButton = document.getElementById("openButton");
let closeButton = document.getElementById("closeButton");

let openSet = document.getElementById("openSet");
let closeSet = document.getElementById("closeSet");

let apiText = document.getElementById("apikeyText");
let apiSet = document.getElementById("apikey");
let keyFeedback = document.getElementById("key-feedback")

apiSet.addEventListener("click", function() {
    if (apiText.value.trim() === "") {
        if (apiText.classList.contains("is-valid")) {
            apiText.classList.remove("is-valid")
            apiText.classList.add("is-invalid")
        } else if (!apiText.classList.contains("is-invalid")) {
            apiText.classList.add("is-invalid")
        }
    } else {
        apiText.classList.remove("is-invalid")
        apiText.classList.add("is-valid")
        chrome.storage.sync.set({"apiKey": apiText.value}, function() {});
    }
})

openButton.addEventListener("click", function() {
    if (openText.value === "") return;
    chrome.storage.sync.set({"openText": openText.value}, function() {
        openSet.innerText = "Open text set"
        openText.classList.add("is-valid");
        console.log(openText.value);
    } );
})


closeButton.addEventListener("click", function() {
    if (closeText.value === "") return;
    chrome.storage.sync.set({"closeText": closeText.value}, function() {
        closeSet.innerText = "Close text set"
        closeText.classList.add("is-valid");
        console.log(closeText.value);
    });
})

document.getElementById("reset").addEventListener("click", function() {
    openSet.innerText = "Reset to +"
    closeSet.innerText = "Reset to -"
    chrome.storage.sync.set({"openText": "+"}, function() {})
    chrome.storage.sync.set({"closeText": "-"}, function() {})
});
    