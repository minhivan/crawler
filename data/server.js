const fs = require('fs-extra');
const path = require('path');
const dirRoot = process.cwd().replace(/\\/g,'/');
const exec = require('child_process').exec;
const dirProcFile = dirRoot +'/data';
const dirTemp = dirRoot+'/temp';
fs.ensureDirSync(dirProcFile);
fs.ensureDirSync(dirTemp);

const { JSDOM } = require("jsdom");
const { window } = new JSDOM('');
const $ = require(dirProcFile+"/jquery.js")( window );

const xlsx = require('node-xlsx');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 1337 });
let execCrawler = require(dirProcFile+'/execCrawler.js');

const uPptGeneral = dirTemp+'/uPptGeneral';
const dirUser = dirRoot +'/user';
fs.ensureDirSync(dirUser)
const dirTempPpt = dirRoot+'/tempPpt';

var dirChrome = fs.readdirSync(dirRoot+'/node_modules/puppeteer/.local-chromium/')
dirChrome.find(el=>{
	let dirTg = dirRoot+'/node_modules/puppeteer/.local-chromium/'+el+'/chrome-win'
	if (el.includes('win') && fs.existsSync(dirTg+'/chrome.exe')) {
		dirChrome = dirTg
		return true
	}
	return false
})

var argsPpt = { headless: false,
	defaultViewport: null, ignoreHTTPSErrors: true,
  executablePath: dirChrome+'/chrome.exe',
	args: [
    `--load-extension=${dirProcFile}/WebScraper`,
		'--start-maximized',
		'--proxy-bypass-list=*',
		'--proxy-server="direct://"',
		'--ignore-certifcate-errors',
		'--ignore-certifcate-errors-spki-list'
	],
	ignoreDefaultArgs : [ '--hide-scrollbars',
		'--enable-automation',
		'--password-store=basic',
		'--disable-client-side-phishing-detection',
		'--disable-sync',
		'--disable-background-networking',
		'--disable-breakpad',
		'--disable-component-extensions-with-background-pages',
		'--disable-default-apps',
		'--disable-dev-shm-usage',
		'--disable-extensions',
		'--disable-features=TranslateUI',
		'--disable-hang-monitor',
		'--disable-ipc-flooding-protection',
		'--disable-prompt-on-repost',
		'--enable-features=NetworkService,NetworkServiceInProcess',
		'--no-first-run',
		'--use-mock-keychain',
		'--force-color-profile=srgb',
		'--metrics-recording-only',
    '--disable-popup-blocking',
    '--disable-renderer-backgrounding'
	],
	env : {
		TZ: 'Asia/Bangkok',
		...process.env,
	}
};
var hlargsPpt = JSON.parse(JSON.stringify(argsPpt))
hlargsPpt.headless = true;

// Ppt General
var argsPptGeneral = {
	...argsPpt		,  userDataDir: uPptGeneral.replace(/\//g,'\\'),
};
var hlargsPptGeneral = JSON.parse(JSON.stringify(argsPptGeneral))
hlargsPptGeneral.headless = true;

var browserGeneral;

wss.on('connection', function (ws) {
  ws.on('message', async (message) => {
    if (message.includes('execCrawler')) {
      try {
        let crawlData = [];
  			let pageUrl;

  		  $('<div>'+JSON.parse(message).data+'</div>').children().each((inx, ele) => {
  				if (inx == 0) {
  					pageUrl = $(ele).attr('pageUrl')
  				}
  		    let formData = []
  		    $(ele).find('td[name="lstSelectors"] > div > p').each((inx2, ele2) => {
  					let treeData = JSON.parse($(ele2).text())
  					let index = -1
  					let id = treeData.find((el, ix) => {
  						if (el.name == "id") {
  							index = ix
  							return true
  						}
  						return false
  					})
  					if (!id) {
  						treeData.push({
  							name: "id",
  							value: "id_"+Math.random().toString(36).substr(2,5)
  						})
  					} else {
  						treeData[index].value = id.value || "id_"+Math.random().toString(36).substr(2,5)
  					}
  		      formData.push([...treeData])
  		    })
  		    crawlData.push([...formData])
  		  })

        // test: nhap vao danh sach link SP se bo qua
        let ignoreData = []
  			// let ignoreData = xlsx.parse("C:\\Users\\F4-PC-Son\\Desktop/Book1.xlsx")[0].data.map(el => el[0]);
  			// ignoreData.splice(0, 1)
  			// console.log(ignoreData);
        // console.log(crawlData);

		    // test: chi lay 3 dom dau tien:
        let numDomMaxToGet = 2

				// test: chi lay 2 trang dau tien:
        let numPageMaxToGet = 2

        let outArrExcel = await execCrawler.call(puppeteer, pageUrl, crawlData, ignoreData, numDomMaxToGet, numPageMaxToGet, browserGeneral, argsPptGeneral)

  			// console.log(outArrExcel);

  			let dirKq = dirUser+'/crawlData_'+Date.now()+'.xlsx';
  			await fs.writeFileSync(dirKq,
  				xlsx.build([{name: "crawlData",
  					data: outArrExcel
  				}])
  			);

				console.log("Done! File saved in: "+dirKq);

  			// exec('start "" "'+dirKq+'"'
  			// 	,(error, stdout, stderr) => {}
  			// );

  			ws.send('done 1');
      } catch (er) {
        console.log(er);
      }
    }
  });
});

mainFunc()
async function mainFunc() {
  browserGeneral = await puppeteer.launch(argsPptGeneral);	//headful
}
