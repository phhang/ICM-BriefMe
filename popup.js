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
            loggedInState(accessToken);
            return;
        }
    }
    // Access token is not valid or expired
    loggedOutState();
});

function loggedInState(accessToken) {
    const JwtPayload = JSON.parse(atob(accessToken.split('.')[1])); // Decode the JWT payload (second part of the token)
    const welcomeMsg = document.getElementById("WelcomeMsg");
    welcomeMsg.innerText = "Welcome, current user: " + JwtPayload.upn;
    const loginButton = document.getElementById("loginButton");
    // Hide login button
    loginButton.style.display = "none";
    // Show logout briefMe SITREP buttons
    const idNames = ["logoutButton", "briefMeButton", "currentStatusButton"];
    idNames.forEach(idName => {
        const element = document.getElementById(idName);
        element.style.display = "block";
    });
}

function loggedOutState() {
    chrome.storage.local.clear(); // Clear all local storage
    const welcomeMsg = document.getElementById("WelcomeMsg");
    welcomeMsg.innerText = "Welcome, please login to use BriefMe";
    const loginButton = document.getElementById("loginButton");
    // Show login button
    loginButton.style.display = "block";
    // Hide logout briefMe SITREP buttons
    const idNames = ["logoutButton", "briefMeButton", "currentStatusButton"];
    idNames.forEach(idName => {
        const element = document.getElementById(idName);
        element.style.display = "none";
    });
    const briefMeText = document.getElementById("briefMeText");
    briefMeText.innerText = "This plugin will genearte a summary of the incident. You may need to wait for ICM to fully load all discussion entries.";
}

/*
* Add event listeners
*/ 

// Add event listener to login button
const loginButton = document.getElementById("loginButton");
loginButton.addEventListener("click", async () => {
    const redirect_uri = chrome.identity.getRedirectURL()
    const tenant_id = "72f988bf-86f1-41af-91ab-2d7cd011db47";
    const client_id = "b14aa3b9-e15e-4522-a70d-520854e6f595";
    const authUrl = 
        'https://login.microsoftonline.com/' + tenant_id + '/oauth2/v2.0/authorize?' + // <= here tenant id or just common
        'response_type=token' +
        '&response_mode=fragment' +
        '&prompt=login' +
        '&client_id=' + client_id + // <= here client id from azure console
        '&redirect_uri=' + redirect_uri +
        '&scope=openid';
    let authorizing = chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true
        }
    );
    function validate(returned_url) {
        urlParams = new URLSearchParams(returned_url.split('#')[1]);
        const accessToken = urlParams.get('access_token');
        const expiresIn = urlParams.get('expires_in');
        // Set expire time using current time + expiresIn to int in second
        const expireTime = new Date().getTime() + parseInt(expiresIn) * 1000;
        // Save the access token and expire time to local storage
        chrome.storage.local.set({ "accessToken": accessToken, "accessTokenExpiry": expireTime });
        // Decode the JWT payload (second part of the token)
        loggedInState(accessToken);
    }
    authorizing.then(validate, console.error);
});

// Add event listener to logout button
const logoutButton = document.getElementById("logoutButton");
logoutButton.addEventListener("click", async () => {
    loggedOutState();
});

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
        // Get the first/last number of characters due to token limit. Extra trimming is done in Azure function
        const cappedText = buttonId == "briefMeButton" ? 
            alltextResult[0].result.slice(0, 4200) : 
            alltextResult[0].result.slice(-4000);
        const briefMeMode = buttonId == "briefMeButton" ? "brifeMe" : "SITREP";
        const requestStartTime = performance.now();
        const icmId = "0000";
        const summaryText = await sendRequestToAzure(cappedText, briefMeMode, icmId);
        const briefMeText = document.getElementById("briefMeText");
        briefMeText.innerText = summaryText.trim();
        const requestEndTime = performance.now();

        // Save the current state of the popup page to storage
        chrome.storage.local.set({ 'briefMeTextState': briefMeText.innerText });

        // Enable button
        button.disabled = false;
        button.innerText = buttonContent;
        // Send message to content.js
        const endTime = performance.now();
        const perfStats = {
            "time": (endTime - startTime).toFixed(2) + "ms",
            "requestTime": (requestEndTime - requestStartTime).toFixed(2) + "ms"
        };
        console.log(perfStats);
    });
}

/*
* Helper functions
*/

async function sendRequestToAzureTest(icmText, mode, icmId) {
    await new Promise(r => setTimeout(r, 2000));
    return icmText.slice(0, 100) + "\n A customer reported that their production environment was operating slowly, with very little memory available.";
}

function getAccessToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['accessToken', 'accessTokenExpiry'], (result) => {
            if (result.accessTokenExpiry > new Date().getTime()) {
                resolve(result.accessToken);
            } else {
                reject("Access token expired");
            }
        });
    });
}

async function sendRequestToAzure(icmText, mode, icmId) {
    // Send request to Azure function
    const azFunc = 'https://icm-briefme-fa.azurewebsites.net/api/BriefMeFunc'
    const accessToken = await getAccessToken();
    const response = await fetch(azFunc, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify({ 
            "icmId": icmId,
            "icmText":  icmText,
            "mode": mode
        })
    }).catch((error) => {
        return `Some error occurred: ${error}`; 
    });
    if (!response.ok) {
        return "Error: http Status " + response.status + " " + response.statusText
    }
    const responseData = await response.json();
    const summaryText = responseData.message;
    return summaryText;
}

function joinAllText() {
    function removeIcmKustoElements(current) {
        const kustoStyleList = [
            'span[style="font-family: Calibri; font-size: 8pt"]', 
            'p[style="margin: 0; color: rgba(0, 0, 0, 1); font-size: medium"]',
            'details',
            'table',
            '.flex-grow-1.was-validated.ng-hide', // This is ICM class for editor
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
    const icmAutoGeneratedText = ["Acknowledging incident", "Ticket history"]
    const commentDivBody = document.querySelectorAll("div.body");
    var allText = "";
    for (var i = commentDivBody.length - 1; i >= 0; i--) { 
        // skip the last comment(details)
        if (i == commentDivBody.length - 1) {
            continue;
        }
        const clonedElement = commentDivBody[i].cloneNode(true);
        removeIcmKustoElements(clonedElement);
        var innerText = clonedElement.innerText;
        if (icmAutoGeneratedText.some((text) => innerText.includes(text))) {
            continue;
        } else {
            allText += innerText;
        }
    }
    return allText;
}
