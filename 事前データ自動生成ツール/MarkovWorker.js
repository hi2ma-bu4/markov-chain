var times = new Date().getTime();
self.addEventListener('message', function(e) {
	let mInd = e.data[0];
	self.postMessage([mInd,"p","ライブラリ接続中..."]);
	import("../kuromoji.js").then(module => {
		// Kuromoji
		self.postMessage([mInd,"p","ライブラリ読込中..."]);
		kuromoji.builder({dicPath: "../dict"}).build((err, tokenizer)=>{
			var oriSegs = [],
				oriPoss = [];

			PreGenerated(e.data[1]);

			e.data = undefined;
			delete e.data; //メモリ解放

			function PreGenerated(result){
				self.postMessage([mInd,"p","形態素解析中..."]);

				let tokens = tokenizer.tokenize(result);
				let maxT = tokens.length;
				let couT = 0;
				tokens.forEach((token)=>{
					oriSegs.push(token.surface_form);// 単語を追加する
					oriPoss.push(token.pos);// 品詞を追加する
					if(!(couT % 400)){
						self.postMessage([mInd,"p","データ整理中...(" + couT + "/" + maxT + ")"]);
					}
					couT++;
				});
				tokens = undefined;
				delete tokens; //メモリ解放
				outputs();
			}

			function outputs(){

				self.postMessage([mInd,"d1",oriSegs.join(",")]);
				self.postMessage([mInd,"d2",oriPoss.join(",")]);

				self.postMessage([mInd,"p","実行処理完了 - " + ((new Date().getTime()-times)/1000) +"s"]);
				self.postMessage([mInd,"e"]);
			}
		}, false);
	});
}, false);