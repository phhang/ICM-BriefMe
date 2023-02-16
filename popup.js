// Add event listener to foldTableButton, when clicked, use content.js to fold tables
const foldTableButton = document.getElementById("foldTableButton");
foldTableButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const response = await chrome.tabs.sendMessage(tab.id, {foldLargeTable: "true"});
});

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


// Add event listener to buttons, when clicked, get slice and open unify/etc...
const unifyQueryButton = "unifyQueryButton";
const jarvisDashboardButton = "jarvisDashboardButton";
const memoryDashboardButton = "memoryDashboardButton";
const restartsQueryButton = "restartsQueryButton";
const crashQueryButton = "crashQueryButton";
const buttonList = [unifyQueryButton, jarvisDashboardButton, memoryDashboardButton, restartsQueryButton, crashQueryButton];
buttonList.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    button.addEventListener("click", listenerWrapper(button));
});

function listenerWrapper (currentButton) {
    return async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: buttonActionFunction,
            args: [currentButton.id]
        });
        let creating = chrome.tabs.create({
            url: results[0].result
        });
    }
}

function buttonActionFunction(buttonId) {
    function disableButtonAndChangeText(buttonId) {
        const buttonElement = document.getElementById(buttonId);
        buttonElement.disabled = true;
        buttonElement.innerText = "Slice is missing or empty";
        console.log("Slice is missing or empty");
    }
    
    function buildUrl(buttonId, slice){
        const unifyBaseUrl = "https://unify.services.dynamics.com/AX/Env/";
        const jarvisUrlTemplate = `https://portal.microsoftgeneva.com/dashboard/Dynamics_Prod/DynamicsAX7/Hot%2520Path%2520Metrics%2520-%2520SF%2520Tenant?overrides=[{%22query%22:%22//dataSources%22,%22key%22:%22account%22,%22replacement%22:%22D365FOEE_Prod%22},{%22query%22:%22//*[id%3D%27Environment%27]%22,%22key%22:%22value%22,%22replacement%22:%22${slice}%22},{%22query%22:%22//*[id%3D%27RoleInstance%27]%22,%22key%22:%22value%22,%22replacement%22:%22%22}]%20`;
        const memoryUrlTemplate = `https://dataexplorer.azure.com/dashboards/9d93764d-fcc6-4517-971d-8320de1ccae1?p-_startTime=7days&p-_endTime=now&p-_tenant=v-${slice}&p-_roleinstance=v-AOS1-${slice}#5947733d-be74-4c7d-87e2-3d65f12c42cb`;
        const restartUrlTemplate = `https://unify.services.dynamics.com/AX/Env/${slice}/Runtime/Crashes`
        const crashBaseUrl = "https://preview.dataexplorer.azure.com/dashboards/5ea40bb7-fd07-4bb9-b105-3468c073da26?p-_startTime=7days&p-_endTime=now&p-_environmentId=v-"
        let url = "";
        switch (buttonId) {
            case "unifyQueryButton":
                url = unifyBaseUrl + slice;
                break;
            case "jarvisDashboardButton":
                url = jarvisUrlTemplate;
                break;
            case "memoryDashboardButton":
                url = memoryUrlTemplate;
                break;
            case "restartsQueryButton":
                url = restartUrlTemplate;
                break;
            case "crashQueryButton":
                url = crashBaseUrl + slice;
                break;
            default:
                break;
        }
        return url;
    }

    const sliceElement = document.querySelector('[data-test-id="incidents-widget-location-slice-input"]');
    if (sliceElement === null) {
        disableButtonAndChangeText(buttonId);
        return;
    }
    const textValue = sliceElement.value;
    if (textValue === null || textValue === "") {
        disableButtonAndChangeText(buttonId);
        return;
    }
    return buildUrl(buttonId, textValue);
}

// Here is a log from a customer reported incident:
// I want you to ignore callstack, SQL, Kusto query. I want you to provide a summary of the incident:

// Here is the lastest section of the log from a customer reported incident:
// I want you to ignore callstack, SQL, Kusto query. I want you to provide the latest update of the incident: