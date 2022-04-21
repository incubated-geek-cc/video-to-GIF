const byteToKBScale = 0.0009765625;
const displayedSize=500;
// window.devicePixelRatio = 3.0;
const scale = window.devicePixelRatio;
const yearDisplay=document.getElementById('yearDisplay');
yearDisplay.innerHTML=new Date().getFullYear();

function encode64(input) {
	var output = '', i = 0, l = input.length,
	key = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=', 
	chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	while (i < l) {
		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) enc3 = enc4 = 64;
		else if (isNaN(chr3)) enc4 = 64;
		output = output + key.charAt(enc1) + key.charAt(enc2) + key.charAt(enc3) + key.charAt(enc4);
	}
	return output;
}

var inputVideoClipFile=document.getElementById('inputVideoClipFile');
var inputVideoClipFileBtn=document.getElementById('inputVideoClipFileBtn');
var inputVideoDetails = document.getElementById('inputVideoDetails');
var inputVideoPreview = document.getElementById('inputVideoPreview');

inputVideoClipFileBtn.addEventListener('click', () => {
	let clickEvent = new MouseEvent('click', { view: window, bubbles: false, cancelable: false });
    inputVideoClipFile.dispatchEvent(clickEvent);
});

var startPoint=document.getElementById('startPoint');
var loadingBar=document.getElementById('loadingBar');
var continueCallback=true;
var FPS=0;

function scaleCanvas(_CANVAS, videoObj, vidHeight, vidWidth, scale) {
    _CANVAS['style']['height'] = `${vidHeight}px`;
    _CANVAS['style']['width'] = `${vidWidth}px`;

    let cWidth=vidWidth*scale;
    let cHeight=vidHeight*scale;

    _CANVAS.width=cWidth;
    _CANVAS.height=cHeight;

    _CANVAS.getContext('2d').scale(scale, scale);
}

function readFileAsDataURL(file) {
    return new Promise((resolve,reject) => {
        let fileredr = new FileReader();
        fileredr.onload = () => resolve(fileredr.result);
        fileredr.onerror = () => reject(fileredr);
        fileredr.readAsDataURL(file);
    });
}

const loadVideo = (url) => new Promise((resolve, reject) => {
    var vid = document.createElement('video');
    vid.addEventListener('canplay', () => resolve(vid));
    vid.addEventListener('error', (err) => reject(err));
    vid.src = url;
});
inputVideoClipFile.addEventListener('change', async(evt) => {
	if (!window.FileReader) { alert('Your browser does not support HTML5 "FileReader" function required to open a file.'); return; } 
	let file = evt.target.files[0];
    if(!file) return;

    let fileName=file.name;
    let fileType=file.type;
    let fileSize=(file.size/1024).toFixed(2);

	let b64Str = await readFileAsDataURL(file);
	let videoObj=await loadVideo(b64Str);
	videoObj.autoplay=false;
	videoObj.muted=true;
	videoObj.loop=false;

	let vidDuration=parseInt(videoObj.duration);

	startPoint.setAttribute('max', vidDuration);

	startPoint.addEventListener('change', (evt) => {
		let newStartTime=evt.target.value;
		videoObj.currentTime=newStartTime;
	}, false);
	
	let vidHeight=videoObj.videoHeight; // 720
	let vidWidth=videoObj.videoWidth; // 1280

	videoObj.height=vidHeight;
	videoObj.width=vidWidth;
	videoObj['style']['height']=`${vidHeight}px`;
	videoObj['style']['width']=`${vidWidth}px`;

	inputVideoPreview.appendChild(videoObj);

	let videoDetails='<tr><td>ℹ '+[
		`File Name: <b>${fileName}</b>`,
		`Type: <b>${fileType}</b>`, 
		`Size: <b>${fileSize} ㎅</b>`,
		`Frame(ᴡ ⨯ ʜ): <b>${vidWidth} ᵖˣ ⨯ ${vidHeight} ᵖˣ</b>`,
		`Length: <b>00:00:${ vidDuration >=10 ? vidDuration : ('0'+vidDuration)}</b>`
	].join(' │ ') +'</td></tr>';
	inputVideoDetails.innerHTML=videoDetails;

	let _CANVAS = document.createElement('canvas');
	scaleCanvas(_CANVAS, videoObj, vidHeight, vidWidth, scale);
	document.getElementById('hiddenCanvas').appendChild(_CANVAS);
    // =============== calculate displayed sizes ====================
    let sizeBenchmark=vidHeight;
    if(vidWidth>vidHeight) {
    	sizeBenchmark=vidWidth;
    }
	let scaleRatio=parseFloat(displayedSize/sizeBenchmark);
	let displayedHeight=scaleRatio*vidHeight;
	let displayedWidth=scaleRatio*vidWidth;

	videoObj['style']['height']=`${displayedHeight}px`;
	videoObj['style']['width']=`${displayedWidth}px`;

	scaleCanvas(_CANVAS, videoObj, displayedHeight, displayedWidth, scale);

	var encoder = new GIFEncoder(vidWidth, vidHeight);
    encoder.setRepeat(0);
	encoder.setDelay(6);
	encoder.setQuality(18);//  [1,30] | Best=1 | >20 not much speed improvement.

	var startTime=0;
	var frameIndex=0;
	var staticFrames='';

	var requiredFPSDelay=0;
	var requiredFPS=parseInt(document.getElementById('fpsDropdownList').value);
	const step = async() => {
		if(startTime == 0) { 
			startTime=(Date.now()); 
		}// in milliseconds
		
		let _CANVAS_CTX=_CANVAS.getContext('2d');
      	_CANVAS_CTX.drawImage(videoObj, 0, 0, displayedWidth, displayedHeight);
      	encoder.addFrame(_CANVAS_CTX);

      	let frameB64Str=_CANVAS.toDataURL();
      	staticFrames+=`<th><small>Frame #${frameIndex++}</small><br><img src=${frameB64Str} width='75' /></th>`;
      	
      	if(FPS==0) { 
      		let elapsed = ((Date.now()) - startTime) / 1000.0;
      		FPS=(frameIndex / elapsed)*1000.0;
      		requiredFPSDelay=FPS-(requiredFPS*1000);
	      	if(requiredFPSDelay<0) {
	      		requiredFPSDelay=0;
	      	}
      	}
      	
	    // console.log([FPS, (requiredFPS*1000), requiredFPSDelay]);
  		await new Promise((resolve, reject) => setTimeout(resolve, requiredFPSDelay));

      	if(continueCallback) {
      		videoObj.requestVideoFrameCallback(step);
      	}
    };

	videoObj.addEventListener('play', (vEvt) => {
		if(continueCallback) {
			videoObj.requestVideoFrameCallback(step);
		}
		encoder.start();
		loadingBar['style']['display']='block';
		loadingBar['style']['background-image']='url(img/loading.gif)';
	    loadingBar['style']['background-position']='center';
	    loadingBar['style']['background-repeat']='no-repeat';
	    loadingBar['style']['background-size']='contain';

	    loadingBar['style']['height']='2rem';
	    loadingBar['style']['width']='19rem';
	}, false);
	
	videoObj.addEventListener('ended', (vEvt) => {
		loadingBar['style']['display']='none';
		continueCallback=false;
		encoder.finish();

    	var fileType='image/gif';
        var fileName = `gif-output-${(new Date().toGMTString().replace(/(\s|,|:)/g,''))}.gif`;
        var readableStream=encoder.stream();
        var binary_gif =readableStream.getData();
		var b64Str = 'data:'+fileType+';base64,'+encode64(binary_gif);
		var fileSize = readableStream.bin.length*byteToKBScale;
		fileSize=fileSize.toFixed(2);

		let dwnlnk = document.createElement('a');
		dwnlnk.download = fileName;
		dwnlnk.innerHTML = `💾 <small>Save</small>`;
		dwnlnk.className = 'btn btn-outline-dark';
		dwnlnk.href = b64Str;

		let htmlStr='';
        htmlStr+='<thead>';
        htmlStr+='<tr align="left">'; 
        htmlStr+=`<th colspan='2' class='imageBg'><h4>🎬 Output GIF</h4><img id='outputGif' src='${b64Str}' style='width:${displayedWidth}px;height:${displayedHeight}px;' alt='${fileName}' /><div class='table-responsive'><table><tr align='center'>${staticFrames}</tr></table></div></th>`;
        htmlStr+='</tr>';
        htmlStr+='</thead>';

        htmlStr+='<tbody>';
        htmlStr+='<tr>';
        htmlStr+='<td>ℹ '+[
        					`Type: <b>${fileType}</b>`, 
        					`Size: <b>${fileSize} ㎅</b>`, 
        					`# of Frame(s): <b>${frameIndex}</b>`,
        					`FPS: <b>${document.getElementById('fpsDropdownList').value}</b>`, 
        					`Frame (ᴡ ⨯ ʜ): <b>${ parseInt(vidWidth)} ᵖˣ ⨯ ${vidHeight} ᵖˣ</b>`,
        					`${dwnlnk.outerHTML}`
    					].join(' │ ') +'</td>'; 
        htmlStr+='</tr>';
        htmlStr+='</tbody>';
        inputVideoDetails.insertAdjacentHTML('afterend', htmlStr);
	}, false);

	var convertBtn=document.getElementById('convertBtn');
	convertBtn.addEventListener('click', () => {
		videoObj.play();
		convertBtn.removeEventListener('click',null,false);
	}, false);
});