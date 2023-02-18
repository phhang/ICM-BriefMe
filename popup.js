// Add event listener to briefMe button
const briefMeButton = document.getElementById("briefMeButton");
briefMeButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: removeKustoElements
    });
    let alltextResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: joinAllText
    });
    const cappedText = alltextResult[0].result.slice(0, 6000);
    const summaryText = await sendRequestToAzure(cappedText);
    alert(summaryText);
    const briefMeText = document.getElementById("briefMeText");
    briefMeText.innerText = summaryText;
    const response2 = await chrome.tabs.sendMessage(tab.id, {
        briefMe: "brief",
        summary: summaryText
    });
});

const currentStatusButton = document.getElementById("currentStatusButton");
currentStatusButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: removeKustoElements
    });
    let alltextResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: joinAllText
    });
    const cappedText = alltextResult[0].result.slice(-6000);
    const summaryText = await sendRequestToAzure(cappedText);
    alert(summaryText);
    const briefMeText = document.getElementById("briefMeText");
    briefMeText.innerText = summaryText;
    const response2 = await chrome.tabs.sendMessage(tab.id, {
        briefMe: "status",
        summary: summaryText
    });
});

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
    for (var i = commentDivBody.length - 1; i >= 0; i--) {
        var innerText = commentDivBody[i].innerText;
        allText += innerText;
    }
    return allText;
}