// const commentDivBody = document.querySelectorAll("div.body");
// var allText = "";
// for (var i = commentDivBody.length - 1; i >= 0; i--) {
//     // TODO: Use recursion to handle nested divs, remove table and kusto query
//     var divBody = commentDivBody[i];
//     const innerText = divBody.innerText;
//     allText += innerText;
// }
// console.log(allText);

// Add event listener to foldTableButton, when clicked, use content.js to fold tables
const foldTableButton = document.getElementById("foldTableButton");
foldTableButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const response = await chrome.tabs.sendMessage(tab.id, {foldLargeTable: "true"});
});

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
        const memoryUrlTemplate = `https://jarvis-west.dc.ad.msft.net/dashboard/Dynamics_Prod/DynamicsAX7/Runtime%2520HotPath?overrides=[{%22query%22:%22//*[id=%27%27]%22,%22key%22:%22value%22,%22replacement%22:%22D365FOEE_Prod%22},{%22query%22:%22//*[id=%27Environment%27]%22,%22key%22:%22value%22,%22replacement%22:%22${slice}%22},{%22query%22:%22//*[id=%27__Tenant%27]%22,%22key%22:%22value%22,%22replacement%22:%22%s%22},{%22query%22:%22//*[id=%27RoleInstance%27]%22,%22key%22:%22value%22,%22replacement%22:%22AOS1-${slice}%22}]%20`;
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

