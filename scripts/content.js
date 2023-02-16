const debugModeFlag = true;
const tableFoldThresholdRows = 5;
const tableFoldThresholdColumns = 6;
let foldCount = 0;

const loadTime = performance.now();
window.addEventListener('load', foldLargeTable);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.briefMe !== undefined){
            console.log("briefMe: " + request.briefMe)
            console.log(request.summary)
        }
        else if (request.foldLargeTable === "true" && foldCount === 0)
            foldLargeTable();
        else if (request.foldLargeTable === "true")
            console.log("foldLargeTable already called. Last fold count: " + foldCount);
    }
);

function foldTableElement(divElement) {
    if (divElement === null) {
        return false;
    }
    const commentTable = divElement.querySelector("table");
    if (commentTable === null) {
        return false;
    }
    const tableRows = commentTable.rows.length;
    const tableColumns = commentTable.rows[0].cells.length;
    // if (debugModeFlag) {
    //     console.log(`tableRows: ${tableRows}, tableColumns: ${tableColumns}`);
    // }
    if (tableRows < tableFoldThresholdRows && tableColumns < tableFoldThresholdColumns) {
        return; // Only fold large tables
    }
    const tableSize = `Table size: ${tableRows} x ${tableColumns}`;
    const detailsElement = document.createElement("details");
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = tableSize;
    detailsElement.appendChild(detailsSummary);
    detailsElement.appendChild(commentTable);
    divElement.appendChild(detailsElement);
    return true;
}

function foldLargeTable(){
    const startTime = performance.now();
    const commentDivBody = document.querySelectorAll("div.body");
    for (var i = 0; i < commentDivBody.length; i++) {
        var divBody = commentDivBody[i];
        // TODO: Check case where: div.body span (div) table
        if (foldTableElement(divBody)) {
            foldCount++;
        }
        const spanElements = divBody.querySelectorAll("span");
        for (var j = 0; j < spanElements.length; j++) {
            var spanElement = spanElements[j];
            if (foldTableElement(spanElement)) {
                foldCount++;
            }
            const divElements = spanElement.querySelectorAll("div");
            for (var k = 0; k < divElements.length; k++) {
                var divElement = divElements[k];
                if (foldTableElement(divElement)) {
                    foldCount++;
                }
            }
        }
    }
    const endTime = performance.now();

    if (debugModeFlag) {
        console.log(`foldCount: ${foldCount}`);
        console.log(`Extension Time taken: ${(endTime - startTime).toFixed(1)} ms`);
        console.log(`ICM time taken: ${(startTime - loadTime).toFixed(1)} ms`);
    }
}