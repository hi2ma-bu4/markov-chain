var times = new Date().getTime();

const d62c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
let chars = {};
let cn = d62c.length;
for (let i=0;i<cn;i++){
	chars[d62c[i]] = i;
}
function decimalTo10(num){
	let converted = 0;
	for(let i=0;i<num.toString().length;i++){
		converted += chars[num.substr(-(i+1), 1)] * Math.pow(cn, i);
	}
	return converted;
}

self.postMessage(["","ライブラリ接続中..."]);
import("./kuromoji.js").then(module => {
	// Kuromoji
	self.postMessage(["","ライブラリ読込中..."]);
	kuromoji.builder({dicPath: "./dict"}).build((err, tokenizer)=>{
		var oriSegs,
			oriPoss,
			oriSegsInd = [];

		getCSV(1);

		function getCSV(i){
			self.postMessage(["","csv" + i + "読込中..."]);
			let req = new XMLHttpRequest();
			req.onload = function(){
				convertCSVtoArray(i, req.responseText);
				delete req.responseText; //メモリ解放
			}
			req.open("get", "./MarkovArrangement" + i + ".csv", true);
			req.send(); // HTTPリクエストの発行
		}
		function convertCSVtoArray(i, str){
			self.postMessage(["","csv" + i + "データ解析中..."]);
			switch(i){
				case 1:
					oriSegs = str.split(',');
					break;
				case 2:
					oriPoss = str.split(',');
					break;
				case 3:
					oriSegsInd = str.split(',');
					let j = 0;
					for(let i=0,li=oriSegsInd.length;i<li;i++,j++){
						oriSegsInd[i] = decimalTo10(oriSegsInd[i]);
						if(j >= 1000000){
							j = 0;
							self.postMessage(["","データ10進数変換中...(" + i + "/" + li + ")"]);
						}
					}
					break;
			}
			delete str; //メモリ解放

			if(i < 3){
				getCSV(i+1);
			}
			else{
				self.postMessage(["startupEnd","起動処理完了 - "+ ((new Date().getTime()-times)/1000) +"s"]);
			}
		}

		self.addEventListener('message', function(e) {
			var lens = [],
				lpos = [];
			var text = e.data[0],
				DMC = +e.data[1][0],
				PartSpeech = e.data[1][1],
				Generous = +e.data[1][2],
				ansLen = +e.data[1][3],
				endQuark = e.data[1][4],
				PoS = e.data[2],
				Wor = e.data[3];
			times = new Date().getTime();
			self.postMessage(["","形態素解析中..."]);
			if(text.length != 0){
				var tokens = tokenizer.tokenize(text);
				tokens.forEach((token)=>{
					lens.push(token.surface_form);	// 単語を追加する
					lpos.push(token.pos);		// 品詞を追加する
				});
			}

			self.postMessage(["","文章生成前準備中..."]);
			creates(lens,lpos);

			function creates(lens,lpos) {
				var endMark = /。$/;
				var lensc,ans = "";
				var segs,poss;
				var make_sentence = lens.slice(),
					make_pos = lpos.slice();
				var loopCou;
				var firstIndex;


				var oldLen = make_sentence.join("").length;

				do {
					segs = make_sentence.concat(oriSegs.slice());
					poss = make_pos.concat(oriPoss.slice());
					lensc = make_sentence.length;
					loopCou = (segs.length - DMC)|0;

					let indexs = [];
					segs.map(function(value, index, array) {
						if (index >= lensc){
							for(let i=0;i<DMC*6;i++){
								if(segs[index-i] == make_sentence[lensc-i-1]){
									for(let j=1;j<=(i+1)*3;j++){
										indexs.push(index);
									}
								}else{
									break;
								}
							}
						}
					});
					firstIndex = indexs[(Math.random() * indexs.length)|0] + 1;

					if(indexs.length == 0){
						indexs = [];
						segs.map(function(value, index, array) {
							if (index < segs.length &&
								value.slice(0,1) == "。") {
								indexs.push(index);
							}
						});
						firstIndex = indexs[Math.floor(Math.random() * indexs.length)];
					}

					let tmp = 0;
					if(text == "" || text.slice(-1) == "。"){
						if(segs[firstIndex] == "。"){
							tmp = 1;
							make_sentence.push(segs[firstIndex + 1]);
							make_pos.push(poss[firstIndex + 1]);
						}else{
							make_sentence.push(segs[firstIndex]);
							make_pos.push(poss[firstIndex]);
						}
					}else{
						make_sentence.push(segs[firstIndex]);
						make_pos.push(poss[firstIndex]);
					}
					for(let i=1;i<DMC;i++){
						make_sentence.push(segs[firstIndex + tmp + i]);
						make_pos.push(poss[firstIndex + tmp + i]);
					}

					self.postMessage(["","文章生成中..."]);
					while(true){
						/* 次に続くことが可能な単語達が入る */
						var words = [];
						var w_dex = [];
						let tmpM = make_sentence.length - DMC;

						let searchStr = make_sentence[tmpM];
						let binTop = binHeadSearch(oriSegs, oriSegsInd, searchStr);

						if(binTop != -1){
							for(let i=binTop;i<loopCou;i=(i+1)|0){
								let osi = oriSegsInd[i] + lensc;
								if(searchStr !== segs[osi]){
									break;
								}
								let flag = 0;
								for(let j=0;j<DMC;j=(j+1)|0){
									if(make_sentence[tmpM + j] !== segs[osi + j]){
										flag++;
									}
									if(PartSpeech && make_pos[tmpM + j] !== poss[osi + j]){
										flag++;
									}
									if(Generous < flag){
										break;
									}
								}
								if(Generous >= flag){
									let tmpD = osi + DMC;
									if(osi < lens.length){ // DMC個とも一致していたら、候補に入れる
										words.push([...new Array(20).fill(segs[tmpD])]);
										w_dex.push([...new Array(20).fill(tmpD)]);
									}
									words.push(segs[tmpD]);
									w_dex.push(tmpD);
								}
							}
						}
						/*
						for(let i=0;i<loopCou;i=(i+1)|0){
							let flag = 0;
							for(let j=0;j<DMC;j=(j+1)|0){
								if(make_sentence[tmpM + j] !== segs[i + j]){
									flag++;
								}
								if(PartSpeech && make_pos[tmpM + j] !== poss[i + j]){
									flag++;
								}
								if(Generous < flag){
									break;
								}
							}
							if(Generous >= flag){
								let tmpD = i + DMC;
								if(i < lens.length){ // DMC個とも一致していたら、候補に入れる
									words.push([...new Array(20).fill(segs[tmpD])]);
									w_dex.push([...new Array(20).fill(tmpD)]);
								}
								words.push(segs[tmpD]);
								w_dex.push(tmpD);
							}
						}
						*/
						if(words.length > 0){
							r = (Math.random() * words.length)|0;

							make_sentence.push(words[r]);
							make_pos.push(poss[w_dex[r]]);

							ans = make_sentence.join("");
							self.postMessage([ans,""]);

							if(endMark.test(words[r])){
								break;
							}
							self.postMessage(["","文章生成中... - "+(ans.length-oldLen)+"/"+ansLen+"c"]);
						}else{	// 候補がない(0個)だったら終了
							ans = make_sentence.join("");
							break;
						}
					}
					if(ans.length <= ansLen + oldLen){
						self.postMessage(["","文章再生成中..."]);
						make_sentence.pop();
						make_pos.pop();
					}
				} while(ans.length <= ansLen + oldLen);
				self.postMessage(["","文章置換中..."]);
				for(let i=0;i<make_sentence.length;i++){
					if(make_pos[i] == "名詞" && PoS[0] != ""){
						make_sentence[i] = PoS[0];
					}
					else if(make_pos[i] == "動詞" && PoS[1] != ""){
						make_sentence[i] = PoS[1];
					}
					else if(make_pos[i] == "助詞" && PoS[2] != ""){
						make_sentence[i] = PoS[2];
					}
					else if(make_pos[i] == "助動詞" && PoS[3] != ""){
						make_sentence[i] = PoS[3];
					}
					else if(make_pos[i] == "副詞" && PoS[4] != ""){
						make_sentence[i] = PoS[4];
					}
					else if(make_pos[i] == "連体詞" && PoS[5] != ""){
						make_sentence[i] = PoS[5];
					}
					else if(make_pos[i] == "記号" && PoS[6] != ""){
						make_sentence[i] = PoS[6];
					}
					else if(make_pos[i] == "感動詞" && PoS[7] != ""){
						make_sentence[i] = PoS[7];
					}
					else if(make_pos[i] == "接続詞" && PoS[8] != ""){
						make_sentence[i] = PoS[8];
					}
					else if(make_pos[i] == "形容詞" && PoS[9] != ""){
						make_sentence[i] = PoS[9];
					}
					else if(make_pos[i] == "接頭詞" && PoS[10] != ""){
						make_sentence[i] = PoS[10];
					}
					else{
						//console.log(make_pos[i]);
					}
				}
				if(endQuark){
					for(let i=0,li=(Math.random()*(DMC+3))|0;i<=li;i++){
						make_sentence.pop();
					}
				}
				ans = make_sentence.join("");
				for(let i=Wor.length-1;i>0;i-=2){
					if(Wor[i]!=""){
						ans = ans.replace(new RegExp(Wor[i-1],'g'),Wor[i]);
					}
				}
				self.postMessage(["createEnd",""]);
				self.postMessage([ans,"処理終了 - "+ ((new Date().getTime()-times)/1000) +"s"]);
			}
		});

	}, false);
});

//2分探索法
function binarySearch(list, lisInd, str){
	let index = -1;
	let head = 0;
	let tail = list.length;

	while(head <= tail){
		let center = (( head + tail ) / 2)|0;
		let centerVal = list[lisInd[center]];

		if(centerVal == str){
			index = center;
			break;
		}
		if(centerVal < str){
			head = center + 1;
		}
		else{
			tail = center - 1;
		}
	}
	return index;
}
//2分探索法(重複対応(先頭返却))
function binHeadSearch(list, lisInd, str){
	let ind = binarySearch(list, lisInd, str);
	if(ind <= 0){
		return ind;
	}
	for(let i=ind-1;i>=0;i--){
		if(list[lisInd[i]] != list[lisInd[i+1]]){
			return i+1;
		}
	}
	return 0;
}