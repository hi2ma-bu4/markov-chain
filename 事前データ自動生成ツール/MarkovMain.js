
//webWorkerのスレッド数
var workerThreadCou = 3;
var workerThread = [];

//1小説の最大読込ページ数
//GASはファイルサイズが溢れるので小さく(50MBまで)(=125?)
var maxPage = 3000;

//小説の前書き、後書きの削除最大行数
var maxPreface = 100;

var libPath = "../小説データ/";
var novelData = {
	"Lv999": {
		id: "n7612ct",
		page: 441,
	},
	"ありふれ": {
		id: "n8611bv",
		page: 437,
	},
	"コンサル": {
		id: "n0579dc",
		page: 763,
	},
	"シャンフロ": {
		id: "n6169dz",
		page: 868,
	},
	"異世界放浪メシ": {
		id: "n2710db",
		page: 611,
	},
	"駆除人": {
		id: "n1406cr",
		page: 391,
	},
	"賢者の弟子": {
		id: "n6829bd",
		page: 464,
	},
	"失格紋": {
		id: "n5712dr",
		page: 343,
	},
	"出遅れ": {
		id: "n8206dh",
		page: 591,
	},
	"女神から祝福を": {
		id: "n2031cu",
		page: 309,
	},
	"神拾": {
		id: "n5824ct",
		page: 266,
	},
	"地下室ダンジョン": {
		id: "n0468er",
		page: 132,
	},
	"蜘蛛": {
		id: "n7975cr",
		page: 600,
	},
	"庭に穴": {
		id: "n4136hf",
		page: 55,
	},
	"転スラ": {
		id: "n6316bn",
		page: 304,
	},
	"転ドラ卵": {
		id: "n4698cv",
		page: 718,
	},
	"転剣": {
		id: "n6006cw",
		page: 1011,
	},
	"盗賊しよう。": {
		id: "n1013do",
		page: 91,
	},
	"本好き": {
		id: "n4830bu",
		page: 677,
	},

	"原神": {
		id: "genshin",
		page: 45,
	},
	"原神アイテム説明文": {
		id: "genshinItem",
		page: 3,
	},

	"その他": {
		id: "other",
		page: 2,
	},
	
};

for(let key in novelData){
	if(novelData[key].page > maxPage){
		console.log(`データ溢れ:${key}`)
		novelData[key].page = maxPage;
	}
}

var frameCou = 0;
var times;
var timesSub = 0;

var proLog;
var datas = [];

var data1 = "";
var data2 = "";


function getDatas(){
	times = new Date().getTime();
	$("doBut").disabled = true;
	$("logs").innerHTML = '<span id="proLog">text読み込み中...</span>';
	proLog = $("proLog");

	let keys = [];
	let ind = 0;
	let maxInd = 0;

	for(let key in novelData){
		keys[maxInd] = key;
		maxInd++;
	}
	maxInd--;
	rtLoop(0);
	function rtLoop(j){
		let promiseThread = [];
		let key = keys[j];

		proLog.innerText = "text読み込み中..." + key + " " + ((j/maxInd*100)|0) + "%";

		let ids = libPath + key + "/" + novelData[key].id + "-";
		for(let i=1,li=novelData[key].page;i<=li;i++){
			promiseThread[ind] = readText(ids + i + ".txt");
			ind++;
		}
		Promise.all(
			promiseThread
		).then(function(res){
			datas.push(...res);
			if(maxInd > j){
				rtLoop(j+1);
			}
			else{
				doMarkov();
			}
		});
	}


	function readText(path){
		return new Promise(function(resolve, reject){
			let req = new XMLHttpRequest();
			req.onload = function(){
				resolve(plasticSurgery(req.responseText));
			}
			req.open("get", path, true);
			req.send();
		});
	}
}

function doMarkov(){
	proLog.innerText = "Text整形処理中...";

	let dl = datas.length;
	let dsl = 0;
	for(let i=0;i<dl;i++){
		if(datas[i]){
			dsl += datas[i].length;
		}
	}
	let divisionCou = (dsl / workerThreadCou)|0;
	let strDatas = [];
	let divisCou = -1;
	let ndsl = 0;
	for(let i=0;i<dl;i++){
		if(!i || divisionCou <= ndsl && workerThreadCou > divisCou+1){
			divisCou++;
			strDatas[divisCou] = "";
			ndsl = 0
		}
		let tmp = datas[i];
		if(tmp){
			strDatas[divisCou] += tmp;
			ndsl += tmp.length;
		}
	}
	datas = undefined;
	delete datas; //メモリ解放

	proLog.innerText = "Worker起動処理中...";

	for(let i=0;i<workerThreadCou;i++){
		$("logs").innerHTML += `
			<div>
				<span>スレッド${i+1}&nbsp;:</span>
				<span id="thread${i}">起動失敗</span>
			</div><br/>`;

		workerThread[i] = {};
		workerThread[i].end = true;
		workerThread[i].worker = new Worker('MarkovWorker.js');
		workerThread[i].worker.addEventListener('message', function(e) {
			let ind = e.data[0];
			switch(e.data[1]){
				case "p":
					workerThread[ind].progress = e.data[2];
					break;
				case "d1":
					workerThread[ind].data1 = e.data[2];
					break;
				case "d2":
					workerThread[ind].data2 = e.data[2];
					break;
				case "e":
					console.log("worker" + ind + " end");
					workerThread[ind].end = false;

					workerThread[ind].worker.terminate(); //workerの削除
					delete workerThread[ind].worker; //メモリ解放
			}
		}, false);
		workerThread[i].worker.postMessage([i,strDatas[i]]);
	}

	proLog = $("proLog");
	proLog.innerText = "起動完了";

	strDatas = undefined;
	delete strDatas; //メモリ解放

	
	timesSub = new Date().getTime();
	loop();
}

function loop(){
	if(frameCou > 6){
		frameCou = 0;
		if(draws()){
			timesSub = new Date().getTime();
			loop2();
			return;
		}
	}
	frameCou++;
	requestAnimationFrame(loop);
}

function draws(){
	let endflag = true;
	for(let i=0;i<workerThreadCou;i++){
		if(workerThread[i].progress != ""){
			$("thread" + i).innerText = workerThread[i].progress;
			workerThread[i].progress = "";
		}

		if(workerThread[i].end){
			endflag = false;
		}
	}
	proLog.innerText = "サブスレッド処理待機中..." + ((new Date().getTime()-timesSub)/1000) +"s";
	if(endflag){
		for(let i=0;i<workerThreadCou;i++){
			data1 += workerThread[i].data1;
			data2 += workerThread[i].data2;

			delete workerThread[i].data1; //メモリ解放
			delete workerThread[i].data2; //メモリ解放
		}

		dataSets();
		return true;
	}
}

function dataSets(){
	proLog.innerText = "データ正規化中...";

	$("logs").innerHTML += `
		<div>
			<span>スレッド${workerThreadCou+1}&nbsp;:</span>
			<span id="thread${workerThreadCou}">起動失敗</span>
		</div><br/>`;

	workerThread[workerThreadCou] = {};
	workerThread[workerThreadCou].end = false;
	workerThread[workerThreadCou].worker = new Worker('NormalizationWorker.js');
	workerThread[workerThreadCou].worker.addEventListener('message', function(e) {
			switch(e.data[0]){
				case "p":
					workerThread[workerThreadCou].progress = e.data[1];
					break;
				case "e":
					workerThread[workerThreadCou].data = e.data[1];
					workerThread[workerThreadCou].end = true;

					workerThread[workerThreadCou].worker.terminate(); //workerの削除
					delete workerThread[workerThreadCou].worker; //メモリ解放
			}
		}, false);
		workerThread[workerThreadCou].worker.postMessage(data1);
}

function loop2(){
	if(frameCou > 6){
		frameCou = 0;
		if(draws2()){
			proLog.innerText = "動作完全終了 - " + ((new Date().getTime()-times)/1000) +"s";
			$("doBut").disabled = false;
			return;
		}
	}
	frameCou++;
	requestAnimationFrame(loop2);
}

function draws2(){
	let endflag = true;
	if(workerThread[workerThreadCou].progress != ""){
		$("thread" + workerThreadCou).innerText = workerThread[workerThreadCou].progress;
		workerThread[workerThreadCou].progress = "";
	}
	proLog = $("proLog");
	proLog.innerText = "サブスレッド2処理待機中..." + ((new Date().getTime()-timesSub)/1000) +"s";
	if(workerThread[workerThreadCou].end){
		$("proLog").innerText = "データダウンロード中...";
		let oriInd = workerThread[workerThreadCou].data;
		delete workerThread[workerThreadCou].data; //メモリ解放

		fileDownload(data1, "MarkovArrangement1.csv");
		fileDownload(data2, "MarkovArrangement2.csv");
		fileDownload(oriInd, "MarkovArrangement3.csv");

		delete data1; //メモリ解放
		delete data2; //メモリ解放
		delete oriInd; //メモリ解放
		return true;
	}
}

function $(id){
	return document.getElementById(id)
}

function plasticSurgery(str){
	str = str.replace(/\r/g, '\n');
	let isPreface = str.match(/(\n|^)\*{44}(\n|$)/);
	str = str.split('\n');
	if(isPreface){
		let strlen = str.length;
		for(let i=0,li=strlen>maxPreface?maxPreface:strlen;i<li;i++){
			if(str[i].match(/(\n|^)\*{44}(\n|$)/)){
				str.splice(0, i+1);
				break;
			}
		}
	}
	str = str.slice(1);
	if(isPreface){
		strlen = str.length;
		for(let i=strlen-1,li=strlen>maxPreface?strlen-maxPreface:0;i>=li;i--){
			if(str[i].match(/(\n|^)\*{44}(\n|$)/)){
				str.splice(i, strlen);
				break;
			}
		}
	}
	str = str.join('\n');
	if(str.match(/(\n|^)\*{44}(\n|$)/)){
		console.log(str);
	}
	return str.replace(/[\,，､]/g, '、')
		.replace(/[\.．､]/g, '。')
		.replace(/\&quot;/g, "'")
		.replace(/(\n|^)[ 　](\n|$)/g, '')
		.replace(/\n/g, '')
		.replace(/\|.*?《.*?》/g, function(all){
			return all.replace(/\|/g, '')
				.replace(/《.*?》/g,'');
		})
		.replace(/&lt;i.*&gt;/g, '')
		.replace(/。　/g, '。').replace(/。 /g, '。')
		.replace(/、　/g, '、').replace(/、 /g, '、')
		.replace(/！　/g, '！').replace(/！ /g, '！')
		.replace(/？　/g, '？').replace(/？ /g, '？')
		.replace(/　（/g, '（').replace(/ （/g, '（')
		.replace(/）　/g, '）').replace(/） /g, '）')
		.replace(/　｛/g, '｛').replace(/ ｛/g, '｛')
		.replace(/｝　/g, '｝').replace(/｝ /g, '｝')
		.replace(/　「/g, '「').replace(/ 「/g, '「')
		.replace(/」　/g, '」').replace(/」 /g, '」')
		.replace(/　【/g, '【').replace(/ 【/g, '【')
		.replace(/】　/g, '】').replace(/】 /g, '】')
		.replace(/　『/g, '『').replace(/ 『/g, '『')
		.replace(/』　/g, '』').replace(/』 /g, '』')
		.replace(/　《/g, '《').replace(/ 《/g, '《')
		.replace(/》　/g, '》').replace(/》 /g, '》')
		.replace(/\!　/g, '!').replace(/\! /g, '!')
		.replace(/\?　/g, '?').replace(/\? /g, '?')
		.replace(/　\(/g, '(').replace(/ \(/g, '(')
		.replace(/\)　/g, ')').replace(/\) /g, ')')
		.replace(/　\{/g, '{').replace(/ \{/g, '{')
		.replace(/\}　/g, '}').replace(/\} /g, '}')
		.replace(/　\[/g, '[').replace(/ \[/g, '[')
		.replace(/\]　/g, ']').replace(/\] /g, ']');
}

function fileDownload(content, filename){
	const a = document.createElement("a");
	document.body.appendChild(a);
	a.style.display = "none";
	const blob = new Blob([content], { type: "octet/stream" });
	const url = window.URL.createObjectURL(blob);
	a.href = url;
	a.download = filename;
	a.click();
	window.URL.revokeObjectURL(url);
	a.parentNode.removeChild(a);
}