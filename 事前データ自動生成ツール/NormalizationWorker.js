var times = new Date().getTime();

const d62c = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function decTo62(num){
	let converted = [];
	while(num >= 62){
		converted.unshift(d62c[num % 62]);
		num = (num / 62)|0;
	}
	converted.unshift(d62c[num]);
	return converted.join('');
}

self.addEventListener('message', function(e) {

	self.postMessage(["p","index作成中..."]);

	let data = e.data.split(',');

	var oriInd = [];
	for(let i=0,li=data.length;i<li;i++){
		oriInd[i] = i;
	}

	self.postMessage(["p","データソート中..."]);

	
	oriInd.sort(function(a,b){
		if(data[a] < data[b]){
			return -1;
		}
		else if(data[a] > data[b]){
			return 1;
		}
		return 0;
	});
	


	self.postMessage(["p","index62進数変換中..."]);
	for(let i=0,li=oriInd.length;i<li;i++){
		oriInd[i] = decTo62(oriInd[i]);
	}

	self.postMessage(["p","実行処理完了 - " + ((new Date().getTime()-times)/1000) +"s"]);
	self.postMessage(["e",oriInd.join(",")]);
}, false);
