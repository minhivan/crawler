let console = chrome.extension.getBackgroundPage().console;

///////////////
var connections = {};
chrome.runtime.onConnect.addListener(function (port) {
  chrome.tabs.query( {},
    function(tabs){
      let tab = tabs.find(el => el.id == port.name *1)
      if (tab) {
        bindCrrTab(port)
      }
    }
  )
});



function bindCrrTab(port){
  var tasksBound = {};

  let tabId = port.name *1
  connections[tabId] = port;
  port.postMessage({action: 'connected fr Bgr to Dev at port: '+port.name});

  ///////////////
  var addSelectorBtn = function (details) {
    if (details.tabId == tabId) {
      chrome.tabs.executeScript(tabId, {runAt: "document_start", code: "window.stop(); console.log('stoped navigation')"});
    }
  }

  var extensionListener = function (request, sender) {
    if (request.action == "addSelectorBtn") {
      if (tasksBound.hasOwnProperty("addSelectorBtn") && tasksBound["addSelectorBtn"] == 1) {
        return
      };
      tasksBound["addSelectorBtn"] = 1;

      chrome.webNavigation.onBeforeNavigate.addListener(addSelectorBtn);


    } else if (request.action == "cancelAddSelectorBtn"){
      if (!tasksBound.hasOwnProperty("addSelectorBtn") || tasksBound["addSelectorBtn"] != 1) {
        return
      };
      tasksBound["addSelectorBtn"] = -1;
      chrome.webNavigation.onBeforeNavigate.removeListener(addSelectorBtn);
    }

    chrome.tabs.sendMessage(tabId, request, function(response) {
      console.log(response);
    });
  }

  ///////////////

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(function() {
    console.log('disconn');
    port.onMessage.removeListener(extensionListener);
    for (let key in connections) {
      if (key == connections[key].name *1) {
        delete connections[key]
        break;
      }
    }
    chrome.tabs.sendMessage(tabId, {action: "cancelAddSelectorBtn"});

    ///////////////
    tasksBound["addSelectorBtn"] = -1;
    chrome.webNavigation.onBeforeNavigate.removeListener(addSelectorBtn);
  });
}
///////////////

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request);
  // console.log(sender);
  if (sender.tab) {
    var tabId = sender.tab.id;
    if (tabId in connections) {
      connections[tabId].postMessage(request);
    } else {
      console.log("Tab not found in connection list.");
    }
  } else {
    console.log("sender.tab not defined.");
  }
  sendResponse(true);
});

//////////////////////////////////////


// chrome.pageAction.onClicked.addListener(function(tab) {
//   chrome.tabs.sendMessage(tab.id,{action:"SendIt"});
// });


// chrome.runtime.onMessage.addListener (function (request, sender, sendResponse) {
//   if (request.script) {
//     chrome.tabs.executeScript( request.tabId, {
//       code: request.script
//     });
//   } else if (request.scriptToInject) {
//     chrome.tabs.executeScript(request.tabId, {
//       file: request.scriptToInject
//     });
//   } else if (request.msgToBrg) {
//     sendResponse(request.msgToBrg);
//   } else {
//     sendResponse(request)
//   }
//
//   // console.log(request);
//   // console.log(sender);
//
// });
