// chrome.extension.onMessage.addListener (function (request, sender, sendResponse) {
//   if (request.action == "addSelectorBtn") {
//     sendResponse('heard')
//   } else {
//     sendResponse('heard2')
//   }
// });

// $("body").click( function () {
//
// });

var addSelectorCtn;
var selectorsObj;
var selectorsDom;
var globalTarget = null;

chrome.runtime.onMessage.addListener (async function (request, sender, sendResponse) {
  if (request.action == "addSelectorCtn") {
    addSelectorCtn = request.data;
    globalTarget = null;
    sendResponse('heard')
  } else if (request.action == "addSelectorBtn") {
    $("body").on("contextmenu", function(evt) {evt.preventDefault()});

    $("body").on("mousedown", "div, label, p, th, td, span, h1, h2, h3, h4, h5, h6, a, li, button", async function(event) {
      let selectedTag = event.target
      let crrTag = event.currentTarget

      let actionReq = addSelectorCtn.find(el => el.name == "actionReq").value
      let domType = addSelectorCtn.find(el => el.name == "type").value

      if (actionReq == "click") {
        if (crrTag.tagName.toLowerCase() != domType || globalTarget == selectedTag){
          return
        }
      } else {
        if (crrTag != selectedTag || globalTarget == selectedTag){
          return
        }
      }
      globalTarget = selectedTag
      await hightLightDom(crrTag)

      chrome.runtime.sendMessage({action: 'addSelectorCtn',
        data: {...addSelectorCtn, selectorsObj: selectorsObj}
      }, function(response) {
        console.log(response);
      })
    });
  } else if (request.action == "cancelAddSelectorBtn") {
    $("body").unbind();
    await cancelAddSelectorBtn()
  } else if (request.action == "unHightLightDom") {
    await cancelAddSelectorBtn()
  } else if (request.action == "hightLightDom") {
    addSelectorCtn = request.data
    await hightLightDom()
  }
  sendResponse('heard')
});

async function hightLightDom(crrTag) {
  await cancelAddSelectorBtn()

  let selectorType = addSelectorCtn.find(el => el.name == "selectorType" ).value

  let selectorPath;
  if (!crrTag) {
    selectorPath = addSelectorCtn.find(el => el.name == "result" ).value
  }

  if (selectorType == "cssSelector") {
    selectorsObj = {type: 'cssSelector', path: selectorPath || $(crrTag).getSelectorPath()};
    selectorsDom = {
      domObj: $(selectorsObj.path)
    };
  } else {
    selectorsObj = {type: 'xpath', path: selectorPath || getXPath(crrTag)};
    selectorsDom = {
      domObj: $.xpath(selectorsObj.path)
    }
  };
  selectorsObj.pageUrl = location.href
  selectorsDom.domObj.css('background-color', 'brown')
  selectorsDom.domObj.css('color', 'gold')
}

async function cancelAddSelectorBtn() {
  if (selectorsDom && selectorsDom.domObj) {
    selectorsDom.domObj.css('background-color', "")
    selectorsDom.domObj.css('color', "")
  }
}


(function($) {
    $.xpath = function(exp, ctxt) {
        var item, coll = [],
            result = document.evaluate(exp, ctxt || document, null, 5, null);

        while (item = result.iterateNext())
            coll.push(item);

        return $(coll);
    }
})(jQuery);


function getXPath(el) {
  if (typeof el == "string") return document.evaluate(el, document, null, 0, null)
  if (!el || el.nodeType != 1) return ''
  if (el.id) {
    return "//*[@id='"+el.id+"']"
    // "//*[contains(@id,'"+el.id+"')]"
  }
  var sames = [].filter.call(el.parentNode.children, function (x) { return x.tagName == el.tagName })
  return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + (sames.length > 1 ? '['+([].indexOf.call(sames, el)+1)+']' : '')
};

$.fn.extend({
  getSelectorPath: function () {
      var path,
          node = this,
          realNode,
          name,
          parent,
          index,
          sameTagSiblings,
          allSiblings,
          className,
          classSelector,
          nestingLevel = true;

      while (node.length && nestingLevel) {
          realNode = node[0];
          name = realNode.localName;

          if (!name) break;

          name = name.toLowerCase();
          parent = node.parent();
          // sameTagSiblings = parent.children(name);

          if (realNode.id) {
              name += `[id='${node[0].id}']`
              // `[id*='${node[0].id}']`

              nestingLevel = false;

          } else if (realNode.className.length) {
              className =  realNode.className.split(' ');
              classSelector = '';

              className.forEach(function (item) {
                if (item && /[a-zA-Z\d-_]/.test(item) && !item.includes('active')) {
                  classSelector += `[class*='${item}']`
                }
              });

              name += classSelector;

          }

          // else if (sameTagSiblings.length > 1) {
          //     allSiblings = parent.children();
          //     index = allSiblings.index(realNode) + 1;
          //
          //     if (index > 1) {
          //         name += ':nth-child(' + index + ')';
          //     }
          // }

          path = name + (path ? '>' + path : '');
          node = parent;
      }

      return path;
  }
});
