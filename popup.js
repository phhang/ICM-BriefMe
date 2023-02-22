const briefMeText = document.getElementById('briefMeText');
// Load the previous state of the popup page from storage
chrome.storage.local.get('briefMeTextState', (result) => {
    if (result.briefMeTextState) {
      // Restore the previous state of the popup page
      briefMeText.innerText = result.briefMeTextState;
    }
  });
// Save the current state of the popup page to storage
function saveBriefMeTextState() {
    const briefMeText = document.getElementById('briefMeText');
    chrome.storage.local.set({ 'briefMeTextState': briefMeText.innerText });
}

// Add event listener to briefMe button
handleButtonClick("briefMeButton");
handleButtonClick("currentStatusButton");

function handleButtonClick(buttonId) {
    const button = document.getElementById(buttonId);
    button.addEventListener("click", async () => {
        // Disable button to prevent multiple clicks
        button.disabled = true;
        const buttonContent = button.innerText;
        button.innerText = "Loading...";
        // Get all discussion text content
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: removeKustoElements
        });
        let alltextResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: joinAllText
        });
        // Get the first/last 6000 characters due to token limit
        const cappedText = buttonId == "briefMeButton" ? 
            alltextResult[0].result.slice(0, 6000) : 
            alltextResult[0].result.slice(-6000);
        const summaryText = await sendRequestToAzureTest(cappedText);
        const briefMeText = document.getElementById("briefMeText");
        briefMeText.innerText = summaryText;
        saveBriefMeTextState();
        // Enable button
        button.disabled = false;
        button.innerText = buttonContent;
        const briefMeMode = buttonId == "briefMeButton" ? "brifeMe" : "SITREP";
        const contentResponse = await chrome.tabs.sendMessage(tab.id, {
            briefMe: briefMeMode,
            summary: summaryText
        });
    });
}


async function sendRequestToAzureTest(icmText) {
    await new Promise(r => setTimeout(r, 3000));
    return icmText.slice(0, 100) + "\n A customer reported that their production environment was operating slowly, with very little memory available.";
}

async function sendRequestToAzure(icmText) {
    // alert("sendRequestToAzure");
    // Send request to Azure function
    const azFunc = atob('aHR0cHM6Ly9icmllZm1lZnVuYy5henVyZXdlYnNpdGVzLm5ldC9hcGkvSHR0cFRyaWdnZXJCcmllZk1l');
    const response = await fetch(azFunc, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "incomeMessage":  icmText})
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseData = await response.json();
    const summaryText = responseData.message;
    return summaryText;
}

function removeKustoElements() {
    const kustoStyleList = [
        'span[style="font-family: Calibri; font-size: 8pt"]', 
        'p[style="margin: 0; color: rgba(0, 0, 0, 1); font-size: medium"]',
        'details',
        'table',
    ]
    for (let i = 0; i < kustoStyleList.length; i++) {
        const style = kustoStyleList[i];
        const elementsToRemove = document.querySelectorAll(style);
        for (let j = 0; j < elementsToRemove.length; j++) {
            const elementToRemove = elementsToRemove[j];
            elementToRemove.remove();
        }
    }
}

function joinAllText() {
    const commentDivBody = document.querySelectorAll("div.body");
    var allText = "";
    for (var i = commentDivBody.length - 2; i >= 0; i--) { // -2 to skip the last comment(details)
        var innerText = commentDivBody[i].innerText;
        allText += innerText;
    }
    return allText;
}

