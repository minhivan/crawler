async function execCrawler(pageUrl, crawlData, ignoreData, numDomMaxToGet, numPageMaxToGet, browserGeneral, argsPptGeneral){
	if (!numDomMaxToGet) {
		numDomMaxToGet = -1
	}
	if (!numPageMaxToGet) {
		numPageMaxToGet = -1
	}

	// khoi tao puppeteer
	var objPgReq = {}
	if (!browserGeneral || (browserGeneral && browserGeneral._connection && browserGeneral._connection._closed)) {
		browserGeneral = await this.launch(argsPptGeneral);	//headful
	}
  let page = await browserGeneral.newPage();
	await page.evaluateOnNewDocument(() =>
    document.addEventListener('contextmenu', event => event.preventDefault())
	);
	page.on('request', (request) => {
		objPgReq[request.url()] = Date.now()
	})
	page.on('requestfinished', (request) => {
		delete objPgReq[request.url()]
	})
	// done khoi tao puppeteer

	await page.goto(pageUrl, {waitUntil:'networkidle2'})

	if (!Array.isArray(ignoreData)) {
		ignoreData = []
	}

	let arrKeyId = [""]
	let outData = {}
	let arrParentInfo = [];

  // vong lap tung crrSelectorsData
	let iCrrTree = 0;
	let iPagination = -1;
	let limitNumPg = 0

	crawlData[iCrrTree].find((e1, i1) => {
		if (e1.find(e2 => e2.name == "isPagination" && e2.value == "on")) {
			iPagination = i1;
			return true
		}
		return false
	})

  for (let iCrrRow = 0; iCrrRow < crawlData[iCrrTree].length; iCrrRow++) {
    await mainFuncClickOrGetData(iCrrTree, iCrrRow, iPagination)
  }

	let outArrExcel = [arrKeyId]
	for (let key in outData) {
		let childOutArrExcel = [key]
		for (let key2 in outData[key]) {
			let inx = arrKeyId.indexOf(key2)
			childOutArrExcel[inx] = outData[key][key2]
		}
		outArrExcel.push(JSON.parse(JSON.stringify(childOutArrExcel)))
	}

	try {
		await page.close()
	} catch (e) {}

	return outArrExcel

	// ham con
  async function mainFuncClickOrGetData(iCrrTree, iCrrRow, iPagination) {
		if (iCrrRow == iPagination) {
			return
		}

    let crrUrl = await getPageUrl(page);
		if (ignoreData.includes(crrUrl)) {
			return
		}

    try {
			let crrSelectorsData = crawlData[iCrrTree][iCrrRow]
	    let iChildTree = iCrrTree + 1
	    let arrChildrenData = crawlData[iChildTree]

			let id = crrSelectorsData.find(el => el.name == "id").value
	    let actionReq = crrSelectorsData.find(el => el.name == "actionReq").value
	    let selectorType = crrSelectorsData.find(el => el.name == "selectorType").value
	    let selectorPath = crrSelectorsData.find(el => el.name == "result").value
			let isScroll = crrSelectorsData.find(el => el.name == "isScroll")
			if (isScroll) {
				isScroll = isScroll.value
			}

			if (isScroll == 'on') {
				await scrollPage()
			}

			let arrDom = await getArrSelectors(iCrrTree, iCrrRow, {timeout:15000})

			// vong lap tung selector
			let lengthTotalDom = arrDom.length

			let iFr = 0
			let isFound = -1
			let countLoop = 0

	    for (let iDom = 0; iDom < lengthTotalDom && (numDomMaxToGet <= -1 || countLoop < numDomMaxToGet); iDom++) {
				if (iDom < iFr) {
					continue
				}
				try {
					arrParentInfo[iCrrTree] = {tree: iCrrTree, row: iCrrRow, pos: iDom, url: crrUrl, action: actionReq }

					// scroll until found
					do {
						arrDom = await getArrDom(page, selectorType, selectorPath, {timeout:15000})
						if (arrDom[iDom] || isScroll != 'on') {
							break
						}
						await scrollPage()
					} while (!arrDom[iDom] && isScroll == 'on');

					// truoc khi click hoac get data, check destination page url to ignore

					let objTg = {};
		      if (actionReq == 'click') {
				    let iParentTree = iCrrTree - 1

						// try to click element
						let iL = 0
						do {
							objTg = await clickOrGetData(arrDom[iDom], 'click')
							if (objTg.data != "reGetArrDom") {
								break
							}
							iL++
							arrDom = await getArrDom(page, selectorType, selectorPath, {timeout:5000})
						} while (objTg.data == "reGetArrDom" && iL < 3);

						// th click failed
						if (!objTg.data) {
							let firstLoop = 0
							// try to click lan luot tu grand parent den parent truc tiep
							while (iParentTree < iCrrTree && arrParentInfo[iParentTree] && arrParentInfo[iParentTree].url == crrUrl && arrParentInfo[iParentTree].action == actionReq) {
								firstLoop++
								objTg = await clickOnParentAtPos(iParentTree)

								if (objTg.data != "clicked" && arrParentInfo[iParentTree-1] && arrParentInfo[iParentTree-1].url == crrUrl && arrParentInfo[iParentTree-1].action == actionReq) {
									objTg = await clickOnParentAtPos(iParentTree-1)
									if (objTg.data == "clicked"){
										objTg = await clickOnParentAtPos(iParentTree)
									}
								}

								if (objTg.data == "clicked"){
									// lan dau tien click duoc parent thi break luon
									if (firstLoop == 1) {
										break
									}
								} else {
									if (firstLoop == 1) {
										iParentTree = -1
									} else {
										throw 'done 1'
									}
								}
								iParentTree++
							}

							await pgWaitForLoad()
							arrDom = await getArrDom(page, selectorType, selectorPath, {timeout:5000})
							do {
								try {
									console.log('re-clicking');
									await arrDom[iFr].click();
									isFound = 1
									break;
								} catch (e) {
									if (isFound == 1) {
										throw 'done 2'
									}
									iFr++
								}
							} while (iFr < lengthTotalDom);
						}

						// luu thong tin click
						if (!outData.hasOwnProperty(objTg.pageUrl)) {
							outData[objTg.pageUrl] = {}
						}
						if (!arrKeyId.includes(id)) {
							arrKeyId.push(id)
						}
						outData[objTg.pageUrl][id] = objTg.data
						console.log(objTg.pageUrl);

						// vong lap child Tree
						if (crawlData[iChildTree] && objTg.data != "ignored") {
							let iChildPagination = -1;
							crawlData[iChildTree].find((e1, i1) => {
								if (e1.find(e2 => e2.name == "isPagination" && e2.value == "on")) {
									iChildPagination = i1;
									return true
								}
								return false
							})

							for (let iChildRow = 0; iChildRow < crawlData[iChildTree].length; iChildRow++) {
						    await mainFuncClickOrGetData(iChildTree, iChildRow, iChildPagination)
						  }
						}

		      } else {
						objTg = await clickOrGetData(arrDom[iDom], actionReq)
						if (objTg.data) {
							if (!outData.hasOwnProperty(objTg.pageUrl)) {
								outData[objTg.pageUrl] = {}
							}
							if (!arrKeyId.includes(id)) {
								arrKeyId.push(id)
							}
							outData[objTg.pageUrl][id] = objTg.data
							console.log(objTg.pageUrl);
						} else {
							break
						}
		      }

				} catch (err) {
					console.log(err);
					break
				}

				if (actionReq == 'click' && await getPageUrl(page) != crrUrl) {
					try {
						await page.goto(crrUrl, {waitUntil:'networkidle2'})
					} catch (e) {}
				}
				iFr++
				countLoop++
	    }
			// done vong lap tung selector

    } catch (err) {
      console.log('error 0', err);
    }
		// navigate back to parent url after clicking
		if (await getPageUrl(page) != crrUrl) {
			try {
				await page.goto(crrUrl, {waitUntil:'networkidle2'})
			} catch (e) {}
		}

		// click pagination
		if (iPagination != -1 && (numPageMaxToGet <= -1 || limitNumPg < numPageMaxToGet)) {
			do {
				try {
					let arrNextPgDom = await getArrSelectors(iCrrTree, iPagination, {timeout:15000})
					await arrNextPgDom[0].click({button: 'right'});
					await sleep(1000)
					await pgWaitForLoad()
					await arrNextPgDom[0].click()
					await sleep(3000)
					await pgWaitForLoad()
					limitNumPg++
					break
				} catch (e) {}
			} while (true);

			if (await getPageUrl(page) != crrUrl) {
				await mainFuncClickOrGetData(iCrrTree, iCrrRow, iPagination)
			}
		}
		// done click pagination, lap lai vong lap hien tai
  }

	async function getPageUrl(page) {
		while (true) {
			try {
				return await page.evaluate(() => location.href)
			} catch (e) {
				await sleep(1000)
			}
		}
	}

	async function getArrSelectors(iCrrTree, iCrrRow, waitOpt) {
		try {
			let crrSelectorsData = crawlData[iCrrTree][iCrrRow]
			let actionReq = crrSelectorsData.find(el => el.name == "actionReq").value
			let selectorType = crrSelectorsData.find(el => el.name == "selectorType").value
			let selectorPath = crrSelectorsData.find(el => el.name == "result").value
			let isScroll = crrSelectorsData.find(el => el.name == "isScroll")
			if (isScroll) {
				isScroll = isScroll.value
			}

			return await getArrDom(page, selectorType, selectorPath, waitOpt)
		} catch (err) {
			return []
		}
	}

	async function clickOrGetData(domEle, actionReq) {
		let objTg = {};
		try {
			objTg = await page.evaluate((element, actionReq, ignoreData) => {
				if (!!( element.offsetWidth || element.offsetHeight || element.getClientRects().length )) {
					let objTg = {pageUrl: location.href}

					if (actionReq == 'click') {
						let desPgUrl = element.getAttribute('href')
						if (desPgUrl && ignoreData.includes(desPgUrl)) {
							objTg.data = "ignored"
						} else {
							element.scrollIntoView(false)
							objTg.data = "clicked"
						}
					} else if (actionReq == "getText"){
						let text = '';
						for (let i = 0; i < element.childNodes.length; ++i){
							if (element.childNodes[i].nodeType === Node.TEXT_NODE){
								text += element.childNodes[i].textContent;
							}
						}
						objTg.data = text.replace(/\s*(\n+|\r+)\s*/g,"\n");
					} else if (actionReq == "getHtml"){
						objTg.data = element.innerHTML
					}

					return objTg
				}
				return {}
			}, domEle, actionReq, ignoreData);
			if (objTg.data == "clicked") {
				try {
					await domEle.click({button: 'right'});
					await sleep(1000)
					await pgWaitForLoad()
				} catch (er) {
					throw er
				}
				await domEle.click()
			}
		} catch (err) {
			if (err.message.includes('Node is detached')) {
				objTg.data = "reGetArrDom"
			} else {
				console.log("Other Err: ", err);
			}
		}
		return objTg
	}

	async function clickOnParentAtPos(iParentTree) {
		try {
			let arrParentDom = await getArrSelectors(arrParentInfo[iParentTree].tree, arrParentInfo[iParentTree].row, {timeout: 1000, visible: true})
			return await clickOrGetData(arrParentDom[arrParentInfo[iParentTree].pos], 'click')
		} catch (err) {
			console.log(err);
		}
	}

	async function pgWaitForLoad() {
		let iW = 0
		let isStop

		do {
			isStop = 1
			for (let key in objPgReq) {
				if (Date.now() - objPgReq[key] < 5000) {
					isStop = -1
					break
				}
			}
			if (isStop == -1) {
				console.log('sleeping');
				await sleep(1000)
				iW++
			}
		} while (isStop == -1 && iW < 10)
		objPgReq = {}
	}

}

// ham con
async function scrollPage(page){
	await page.evaluate(async() => {
	  return new Promise(async (resolve, reject) => {
			var totalHeight = 0
			var distance = 800

			var timeout = setTimeout(function() {
			  if(typeof timer !== 'undefined'){clearInterval(timer)};
			  resolve ();
			}, 60000);

			var timer = setInterval(async () => {
			  var scrollHeight = document.body.scrollHeight
			  await window.scrollBy(0, distance)
			  totalHeight += distance
			  if(totalHeight >= scrollHeight){
					clearInterval(timer)
					clearTimeout(timeout);
					resolve()
			  }
			}, 2000)
	  })
	})
}

async function getArrDom(page, selectorType, selectorPath, waitOpt) {
	console.log('getting Array Dom');
	let arrDom;
	if (selectorType == 'xpath') {
		await page.waitForXPath(selectorPath, waitOpt);
		arrDom = await page.$x(selectorPath);
	} else {
		await page.waitFor(selectorPath, waitOpt)
		arrDom = await page.$$(selectorPath)
	}
	return arrDom
}

function sleep(timer) {
	return new Promise(resolve => {
		setTimeout(function () {
			resolve()
		}, timer);
	});
}

module.exports = execCrawler
