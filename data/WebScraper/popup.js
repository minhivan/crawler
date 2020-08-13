let console = chrome.extension.getBackgroundPage().console;
$(document).ready(function(){
  $("#getPgData").html('test')
  let obj = {x: 1}

  $("#getPgData").click( function () {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {querKey: obj}, function (response) {
        obj = response
        $("#noti").html(obj.x)
      });
    });
  });

});
