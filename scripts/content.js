const debugModeFlag = true;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.briefMe !== undefined){
            console.log("briefMe: " + request.briefMe)
            console.log(request.summary)
            console.log(request.perfStats)
        }
    }
);
