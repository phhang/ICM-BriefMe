/*
* Load the previous state of the popup page from storage
*/

const briefMeText = document.getElementById('briefMeText');
// Load the previous state of the popup page from storage
chrome.storage.local.get('briefMeTextState', (result) => {
    if (result.briefMeTextState) {
        // Restore the previous state of the popup page
        briefMeText.innerText = result.briefMeTextState;
    }
});

// Load accessToken from storage if it exists
chrome.storage.local.get(['accessToken', 'accessTokenExpiry'], (result) => {
    if (result.accessToken) {
        // Restore the previous state of the popup page
        const accessToken = result.accessToken;
        const accessTokenExpiry = result.accessTokenExpiry;
        const now = new Date();
        if (accessTokenExpiry > now) {
            // Access token is still valid
            const loginButton = document.getElementById("loginButton");
            changeWelcomeMsg(accessToken);
            // hide login button
            loginButton.style.display = "none";
        } else {
            // Access token has expired
            chrome.storage.local.remove('accessToken');
            chrome.storage.local.remove('accessTokenExpiry');
        }
    }
});

function changeWelcomeMsg(accessToken) {
    const JwtPayload = JSON.parse(atob(accessToken.split('.')[1])); // Decode the JWT payload (second part of the token)
    const welcomeMsg = document.getElementById("WelcomeMsg");
    welcomeMsg.innerText = "Welcome, current user: " + JwtPayload.upn;
    const loginButton = document.getElementById("loginButton");
    // Hide login button
    loginButton.style.display = "none";
}

/*
* Add event listeners
*/ 

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
        const startTime = performance.now();
        // Disable button to prevent multiple clicks
        button.disabled = true;
        const buttonContent = button.innerText;
        button.innerText = "Loading...";
        // Get all discussion text content
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let alltextResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: joinAllText
        });
        // Get the first/last 6000 characters due to token limit
        const cappedText = buttonId == "briefMeButton" ? 
            alltextResult[0].result.slice(0, 6000) : 
            alltextResult[0].result.slice(-6000);
        const requestStartTime = performance.now();
        const summaryText = await sendRequestToAzureTest(cappedText);
        const briefMeText = document.getElementById("briefMeText");
        briefMeText.innerText = summaryText;
        const requestEndTime = performance.now();
        saveBriefMeTextState();
        // Enable button
        button.disabled = false;
        button.innerText = buttonContent;
        // Send message to content.js
        const endTime = performance.now();
        const briefMeMode = buttonId == "briefMeButton" ? "brifeMe" : "SITREP";
        const perfStats = {
            "time": (endTime - startTime).toFixed(2) + "ms",
            "requestTime": (requestEndTime - requestStartTime).toFixed(2) + "ms"
        };
        const contentResponse = await chrome.tabs.sendMessage(tab.id, {
            briefMe: briefMeMode,
            summary: summaryText,
            perfStats: perfStats
        });
    });
}

async function sendRequestToAzureTest(icmText) {
    await new Promise(r => setTimeout(r, 2000));
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

function joinAllText() {
    function removeKustoElements(current) {
        const kustoStyleList = [
            'span[style="font-family: Calibri; font-size: 8pt"]', 
            'p[style="margin: 0; color: rgba(0, 0, 0, 1); font-size: medium"]',
            'details',
            'table',
        ]
        for (let i = 0; i < kustoStyleList.length; i++) {
            const style = kustoStyleList[i];
            const elementsToRemove = current.querySelectorAll(style);
            for (let j = 0; j < elementsToRemove.length; j++) {
                const elementToRemove = elementsToRemove[j];
                elementToRemove.remove();
            }
        }
    }
    
    const commentDivBody = document.querySelectorAll("div.body");
    var allText = "";
    for (var i = commentDivBody.length - 1; i >= 0; i--) { 
        // skip the last comment(details)
        if (i == commentDivBody.length - 1) {
            continue;
        }
        const clonedElement = commentDivBody[i].cloneNode(true);
        removeKustoElements(clonedElement);
        var innerText = clonedElement.innerText;
        allText += innerText;
    }
    return allText;
}

// Add event listener to login button
const loginButton = document.getElementById("loginButton");
loginButton.addEventListener("click", async () => {
    const redirect_uri = chrome.identity.getRedirectURL()
    const tenant_id = "72f988bf-86f1-41af-91ab-2d7cd011db47";
    const client_id = "b14aa3b9-e15e-4522-a70d-520854e6f595";
    let authorizing = chrome.identity.launchWebAuthFlow(
        {
          url: 'https://login.microsoftonline.com/' + tenant_id + '/oauth2/v2.0/authorize?' + // <= here tenant id or just common
            'response_type=token' +
            '&response_mode=fragment' +
            '&prompt=login' +
            '&client_id=' + client_id + // <= here client id from azure console
            '&redirect_uri=' + redirect_uri +
            '&scope=openid',
          interactive: true
        }
    );
    function validate(redirect_url) {
        const urlParams = new URLSearchParams(redirect_url.split('#')[1]); // Get the query params after the #
        const accessToken = urlParams.get('access_token');
        const expiresIn = urlParams.get('expires_in');
        // Set expire time using current time + expiresIn to int in second
        const expireTime = new Date().getTime() + parseInt(expiresIn) * 1000;
        // Save the access token and expire time to local storage
        chrome.storage.local.set({ "accessToken": accessToken, "accessTokenExpiry": expireTime });
        // Decode the JWT payload (second part of the token)
        
        changeWelcomeMsg(accessToken);
    }
    authorizing.then(validate, console.error);
});

