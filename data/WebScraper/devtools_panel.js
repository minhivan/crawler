let contentTypes = {};
let dbObj = {};

let console = chrome.extension.getBackgroundPage().console;
let regexNotWordNNumber = /[^a-zA-Z\d]/
let regexDismiss = /\[([^>\/]+'([^a-zA-Z\d]*)'\)*)*\]/g
// let regexDismiss = /\[[^>]+'([^a-zA-Z\d]*)'\]/g
let regexSplit = /([\[\]])/g

// let regexNotWordNNumber = /(\]\[)|\[|\]/g
// Chi bi thay doi khi mo (lai) dev toool
// chrome.storage.sync.get(["variableName"], function(result){
//   dbObj.variableName = result.variableName || ""
// });


$(document).ready(function(){
  var port = chrome.runtime.connect({
    name: chrome.devtools.inspectedWindow.tabId+""
  });

  var ws = new WebSocket('ws://127.0.0.1:1337');
  ws.onopen = function () {
    if (ws.readyState === ws.OPEN) {
			ws.send('ws client ready');
		}
  };

  ws.onerror = function (error) {
    console.log('ws error', error);
  };

  ws.onmessage = function (message) {
    console.log($('#test').html(message));
  };

  var isAddSelector = -1

  var addSelectorCtn = function(){
    if (isAddSelector == -1) {
      return
    }
    port.postMessage({action: 'addSelectorCtn', data: $('#addSelectorCtn').serializeArray()});
  };

  var cancelAddSelectorBtn = function () {
    isAddSelector = -1
    $('button[name="addSelectorBtn"]').show()
    $("#addSelectorCtn").hide()

    port.postMessage({action: 'cancelAddSelectorBtn'});
  };

  $('#addSelectorCtn').on('keyup change paste', 'select, input', addSelectorCtn);

  $('#bodyCtn').on('click', 'button[name="addSelectorBtn"]', function (event) {
    // chrome.runtime.sendMessage({
    //   tabId: chrome.devtools.inspectedWindow.tabId,
    //   scriptToInject: "test.js"
    // });
    // danglam
    // var inspectString = "inspect(document.querySelector('h1'))";
    // chrome.devtools.inspectedWindow.eval(inspectString)

    isAddSelector = 1
    let formParentID = '#'+event.currentTarget.form.id;
    $('button[name="addSelectorBtn"]').hide()

    $('#addSelectorCtn h2[name="header"] label').html("Thêm Selector vào")
    $('#addSelectorCtn h4[name="noti"]').html("* Vui lòng click chuột PHẢI vào selector muốn chọn...")
    $('#addSelectorCtn h2 span[name="parentID"]').html(formParentID)
    $("#addSelectorCtn").show()

    addSelectorCtn()
    port.postMessage({action: 'addSelectorBtn'});

  });

  $('#applyCombineSelector').click(function () {
    let formParentID = $('#combineSelector span[name="parentID"]').html()
    let outHtml = $('#combineSelector td[name="lstSelectors"]').html()
    $(formParentID+' td[name="lstSelectors"]').html(outHtml)
    $('div[name="combineSelector"]').hide()
  })

  $('#cancelCombineSelector').click(function () {
    $('div[name="combineSelector"]').hide()
  })

  $('#bodyCtn').on('click', 'button[name="combineSelector"]', function (event) {
    let formParentID = '#'+event.currentTarget.form.id;

    let selectorsByXpath = []
    let selectorsByCss = []
    $(formParentID).find('td[name="lstSelectors"] > div > p').each((inx2, ele2) => {
      let crrSelectorsData = JSON.parse(ele2.innerText)
      let selectorType = crrSelectorsData.find(el => el.name == "selectorType").value

      if (selectorType == 'xpath') {
        selectorsByXpath.push(crrSelectorsData)
      } else {
        selectorsByCss.push(crrSelectorsData)
      }
    })

    selectorsByXpath = combineSelector(selectorsByXpath, '/')
    selectorsByCss = combineSelector(selectorsByCss, '>')

    let outHtml = '';

    [selectorsByXpath, selectorsByCss].map(el=>{
      for (let i = 0; i < el.length; i++) {
        outHtml += `<div>
          <p>${JSON.stringify(el[i])}</p>
          <label>
            <i class="fa fa-eye-slash" aria-hidden="true"></i>
            <br>
            <i class="fa fa-pencil-square-o" aria-hidden="true"></i>
            <br>
            <i class="fa fa-trash" aria-hidden="true"></i>
          </label>
        </div>`
      }
    })

    $('#combineSelector span[name="parentID"]').html(formParentID)
    $('#combineSelector td[name="lstSelectors"]').html(outHtml)
    $('div[name="combineSelector"]').show()
  });

  function combineSelector(arrSelectors, spliter) {
    try {
      if (arrSelectors.length < 2) {
        return arrSelectors
      }

      arrSelectors = arrSelectors.reduce((accumulator, crrEle, currentIndex, array) => {
        try {
          if (currentIndex == 0) {
            return [crrEle]
          }

          var iAmend = -1
          var accuPath = accumulator[accumulator.length-1].find((el, ix) => {
            if (el.name == "result") {
              iAmend = ix;
              return true
            }
          }).value
          var crrPath = crrEle.find(el => el.name == "result").value

          var accuArr = accuPath.split(spliter)
          var crrArr = crrPath.split(spliter)
          for (let i2 = 0; i2 < accuArr.length; i2++) {
            if (!accuArr[i2] || !crrArr[i2]) {
              continue
            }
            let accuChildPathArr = accuArr[i2].replace(regexSplit, '#&$1').split('#&')
            let crrChildPathArr = crrArr[i2].replace(regexSplit, '#&$1').split('#&')
            for (let i3 = 1; i3 < accuChildPathArr.length; i3 = i3 + 2) {
              if (accuChildPathArr[i3-1] == crrChildPathArr[i3-1]) {
                if (!accuChildPathArr[i3]) {
                  accuChildPathArr[i3] = ""
                }
                if (!crrChildPathArr[i3]) {
                  crrChildPathArr[i3] = ""
                }
                let outVal = ''
                let startFr = accuChildPathArr[i3].indexOf('=')
                if (accuChildPathArr[i3].substr(0, startFr) != crrChildPathArr[i3].substr(0, startFr)) {
                  var isDiff = 1
                  continue
                }

                for (let i4 = 0; i4 < accuChildPathArr[i3].length; i4++) {
                  if (i4 < startFr || regexNotWordNNumber.test(accuChildPathArr[i3][i4]) || accuChildPathArr[i3][i4] == crrChildPathArr[i3][i4]) {
                    outVal += accuChildPathArr[i3][i4]
                  }
                }

                // doi childPath tu "id=" thanh "contain id"
                if (accuChildPathArr[i3].includes("id=") && outVal != accuChildPathArr[i3]) {
                  if (spliter == "/") {
                    outVal = outVal.replace("[@id='","[contains(@id,'") + ")"
                  } else {
                    outVal = outVal.replace("[id='","[id*='")
                  }
                };
                accuChildPathArr[i3] = outVal
              } else {
                var isDiff = 1
              }
            }

            accuArr[i2] = accuChildPathArr.join('').replace(regexDismiss,'')
          }
          if (isDiff == 1) {
            accumulator.push(crrEle)
          } else {
            accumulator[accumulator.length-1][iAmend].value = accuArr.join(spliter)
          }
        } catch (er) {
          console.log(er);
        }
        return accumulator
      },[])

      return arrSelectors
    } catch (err) {
      console.log(err);
      return []
    }
  }

  $('#bodyCtn, #combineSelector').on('click', 'i.fa-pencil-square-o', function (event) {
    isAddSelector = 1
    let crrDom = $(event.currentTarget)
    let parentDiv = crrDom.closest('div')
    let domData = parentDiv.find('p').text()
    domData = JSON.parse(domData)

    $('#addSelectorCtn h2[name="header"] label').html("Sửa Selector thứ <span>"+(parentDiv.index()+1)+"</span> của")
    $('#addSelectorCtn h2[name="noti"]').html("")

    domData.map(el => {
      let valTg = el.value
      if (valTg == 'on') {
        $(`#addSelectorCtn [name="${el.name}"]`).prop("checked", true).trigger("change");
      } else {
        $(`#addSelectorCtn [name="${el.name}"]`).val(valTg)
      }
    })
    $("#addSelectorCtn").show()

    addSelectorCtn()
    port.postMessage({action: 'addSelectorBtn'});
  });

  $('#bodyCtn, #combineSelector').on('click', 'i.fa-eye-slash', function (event) {
    let crrDom = $(event.currentTarget)
    crrDom.attr('class', 'fa fa-eye')
    let domData = crrDom.closest('div').find('p').text()
    port.postMessage({action: 'hightLightDom', data: JSON.parse(domData)});
  });

  $('#bodyCtn, #combineSelector').on('click', 'i.fa-eye', function (event) {
    let crrDom = $(event.currentTarget)
    crrDom.attr('class', 'fa fa-eye-slash')
    port.postMessage({action: 'unHightLightDom'})
  });

  $('#bodyCtn, #combineSelector').on('click', 'i.fa-trash', function (event) {
    let parentDom = $(event.currentTarget).closest('div')
    parentDom.remove()
    port.postMessage({action: 'unHightLightDom'})
  });

  $("#saveAddSelectorBtn").click( function () {
    try {
      let objE = $('#addSelectorCtn h2[name="header"] label span')
      let newVal = JSON.stringify($('#addSelectorCtn').serializeArray())
      let formParentID = $('#addSelectorCtn span[name="parentID"]').html()
      if (objE.length > 0) {
        let iEle = objE.html() * 1
        $(formParentID+' td[name="lstSelectors"] div:nth-child('+iEle+') > p').html(newVal)
      } else {
        let str2 = $('#addSelectorCtn input[name="result"]').val()
        if ($(formParentID).text().includes(str2)) {
          $('#notiAddSelector').html('Selector đã có trong danh sách.')
          return
        }

        $(formParentID+' td[name="lstSelectors"]').append(
          `<div>
            <p>${newVal}</p>
            <label>
              <i class="fa fa-eye-slash" aria-hidden="true"></i>
              <br>
              <i class="fa fa-pencil-square-o" aria-hidden="true"></i>
              <br>
              <i class="fa fa-trash" aria-hidden="true"></i>
            </label>
          </div>`
        )
      }

    } catch (err) {
      $('#notiAddSelector').html(err)
    }
    cancelAddSelectorBtn()
  });

  $("#cancelAddSelectorBtn").click(cancelAddSelectorBtn);

  $("#expConfig").click( function () {
    saveToTxt($('#bodyCtn').html(), 'outConfig'+Date.now()+'.txt')
  });

  $("#impConfig").click( function () {
    $('label[name="inputfile"]').show()
  });
  ///////////////

  // listening to the port messages
  port.onMessage.addListener(function(request, sender) {
    if (request.action == "addSelectorCtn") {
      $('#addSelectorCtn input[name="result"]').val(request.data.selectorsObj.path)
      $('#addSelectorCtn select[name="selectorType"]').val(request.data.selectorsObj.type)
      let formParentID = $('#addSelectorCtn span[name="parentID"]').html()
      if (formParentID == '#parenttree') {
        $(formParentID).attr('pageUrl', request.data.selectorsObj.pageUrl)
      }
    } else {
      console.log(request);
    }
  });


  //////////////////////////////

  // chrome.storage.sync.set({"variableName": ""});
  ///////////////

  $("#execCrawler").click( function () {
    let reqData = { action: 'execCrawler',
      data: $('#bodyCtn').html()
    }
    ws.send(JSON.stringify(reqData));
    $('#noti').html("Đang xử lý...")
    // $(this).hide()
  })

  // xu ly giao dien
  $("#addChildrenTree").click( function () {
    let treeLength = $("#bodyCtn > form").length;
    if (treeLength == 0) {
      var treeName = `Parent Tree`
    } else {
      var treeName = `Children Tree ${treeLength}`
    }
    let treeId = treeName.toLowerCase().replace(/\s+/g,'')
    let strTg = `
      <form id="${treeId}" style="margin-left:${treeLength*20}px">
        <table>
          <tr>
            <td>
              <h1>${treeName}</h1>
            </td>
          </tr>
          <tr>
            <td name="lstSelectors">
            </td>
          </tr>
          <tr>
            <td>
              <button type="button" name="addSelectorBtn">Thêm Selectors</button>
              <button type="button" name="combineSelector">Gom Selectors</button>
            </td>
          </tr>
        </table>
      </form>
    `;
    $("#bodyCtn").append(strTg)
  })
  $("#addChildrenTree").trigger('click')
  $("#delChildrenTree").click( function () {
    let treeLength = $("#bodyCtn > form").length;
    let crrDom = $("#bodyCtn > form:nth-child("+treeLength+")")
    var treeName = crrDom.find('h1').html()
    let strTg = `Bạn muốn xóa ${treeName}`;
    strTg = confirm(strTg)
    if (strTg) {
      crrDom.remove()
    }
  })

  $('#addSelectorCtn input[name="isPagination"]').click( function () {
    if ($(this).is(":checked")) {
      $('#addSelectorCtn input[name="multiple"]').prop("checked", false).trigger("change")
    }
  })

  $('#addSelectorCtn input[name="multiple"]').change( function () {
    if ($(this).is(":checked")) {
      $('#addSelectorCtn select[name="selectorType"]').val('cssSelector')
    } else {
      $('#addSelectorCtn select[name="selectorType"]').val('xpath')
    }
  })

  $('#addSelectorCtn select[name="type"]').change( function () {
    let crrVal = $(this).val()
    if (crrVal == "a" || crrVal == "button" || crrVal == "li") {
      $('#addSelectorCtn select[name="actionReq"]').val('click')
    } else if (crrVal == "text"){
      $('#addSelectorCtn select[name="actionReq"]').val('getText')
    } else if (crrVal == "html"){
      $('#addSelectorCtn select[name="actionReq"]').val('getHtml')
    }
  })

  $('#inputfile').click(function() {
    var fr=new FileReader();
    fr.onload=function(){
      $('#bodyCtn').html(fr.result);
      $('button[name="addSelectorBtn"]').show()
    }

    let filePath = $('input[name="inputfile"]')[0].files[0]
    if (filePath) {
      fr.readAsText(filePath);
      $('label[name="inputfile"]').hide()
    }
  })
});

function saveToTxt(txtVal, outPath) {
  var blob = new Blob([txtVal], {type: "text/plain"});
  var url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: outPath
  });
}

function similarity(s1, s2) {
  var longer = s1.toLowerCase();
  var shorter = s2.toLowerCase();
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  var costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}


// // HTML element to output our data.
// const output = document.querySelector('.analysis-output');
//
// const getType = (type) => { return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1'); };
//
// const formatBytes = (size) => { return `${parseInt(size / 1000)} KB` }
//
// // Simple render function.
// const render = () => {
//   output.innerHTML = '';
//   for (let type in contentTypes) {
//     if (contentTypes[type].size > 0) {
//       output.innerHTML += `<div class="table-row"><div class="table-cell">${type}</div><div class="table-cell align-right">${formatBytes(contentTypes[type].size)}</div></div>`;
//     }
//   }
//   output.innerHTML = `<div class="table">${output.innerHTML}</div>`;
// };
//
// chrome.devtools.network.onRequestFinished.addListener(request => {
//     const response = request.response;
//     //  Find the Content-Type header.
//     const contentHeader = response.headers.find(header => header.name === 'Content-Type');
//     if (contentHeader) {
//         const contentType = getType(contentHeader.value);
//         if (!contentTypes[contentType]) {
//             contentTypes[contentType] = { size: 0 };
//         }
//         // Add the size of the body response to our table.
//         contentTypes[contentType].size += response.bodySize;
//         render();
//     }
// });



// Clear the record if the page is refreshed or navigated to another page.
// chrome.devtools.network.onNavigated.addListener(() => contentTypes = {});
