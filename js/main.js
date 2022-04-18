var framesToRemove={};

var yearDisplay=document.getElementById('yearDisplay');
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

var bitmap = document.createElement('canvas');
var videoObj = document.createElement('video');
var vidDuration=0;
var displayedHeight=500;
var displayedWidth;
inputVideoClipFileBtn.addEventListener('click', () => {
	inputVideoClipFile.click();
});

var loadingBar=document.getElementById('loadingBar');
const loadProgressMapper = [
    '▯▯▯▯▯▯▯▯▯▯',
    '▮▯▯▯▯▯▯▯▯▯',
    '▮▮▯▯▯▯▯▯▯▯',
    '▮▮▮▯▯▯▯▯▯▯',
    '▮▮▮▮▯▯▯▯▯▯',
    '▮▮▮▮▮▯▯▯▯▯',
    '▮▮▮▮▮▮▯▯▯▯',
    '▮▮▮▮▮▮▮▯▯▯',
    '▮▮▮▮▮▮▮▮▯▯',
    '▮▮▮▮▮▮▮▮▮▯',
    '▮▮▮▮▮▮▮▮▮▮'
];
const byteToKBScale = 0.0009765625;
var counter=0;

var fps=60;
var frameInterval=165;

inputVideoClipFile.onchange = function(uploadFle) {
    if(uploadFle.target.value !== '' && uploadFle.target.files.length>0) {
        if (!window.FileReader) {
            alert('Your browser does not support HTML5 "FileReader" function required to open a file.');
        } else {
        	framesToRemove={};
            let file = inputVideoClipFile.files[0];

            let fileName=file.name;
            let fileSize=(file.size/1024).toFixed(2);
            let fileType=file.type;

            let fileredr = new FileReader();
            fileredr.onload = function (fle) {
                var b64Str=fle.target.result;
                
                if(videoObj.canPlayType(fileType)) {
                	videoObj.id='inputVideo';
					videoObj.src=b64Str;
					videoObj.height=displayedHeight;
				}
				inputVideoPreview.insertAdjacentHTML('beforeend',`${videoObj.outerHTML}`);
                videoObj.oncanplay = () => {
                	var toContinueLoading=setInterval( () => {
                		var toDisplay=`${loadProgressMapper[counter++]}	ʟᴏᴀᴅɪɴɢ`;
					    loadingBar.innerHTML=toDisplay;
					    if(counter === loadProgressMapper.length) { 
					    	counter=0;
					    }
                	}, 1000/fps);

					vidDuration=parseInt(videoObj.duration);

					var vidHeight=videoObj.videoHeight;
					var vidWidth=videoObj.videoWidth;
					displayedWidth=((displayedHeight/vidHeight)*vidWidth);

					let videoDetails='<tr><td>ℹ '+[
    					`File Name: <b>${fileName}</b>`,
    					`Type: <b>${fileType}</b>`, 
    					`Size: <b>${fileSize} ㎅</b>`,
    					`Frame(ᴡ ⨯ ʜ): <b>${vidWidth} ᵖˣ ⨯ ${vidHeight} ᵖˣ</b>`,
    					`Length: <b>00:00:${ vidDuration >=10 ? vidDuration : ('0'+vidDuration)}</b>`
					].join(' │ ') +'</td></tr>';

					inputVideoDetails.innerHTML=videoDetails;

					bitmap.id='bitmap';
					bitmap.width=vidWidth;
		            bitmap.height=vidHeight;

		            inputVideoPreview.insertAdjacentHTML('beforeend', `<div style="display:none">${bitmap.outerHTML}</div>`);

		            const inputVideo=document.getElementById('inputVideo');
		            const bitmapCanvas=document.getElementById('bitmap');
		            const bitmapCtx = bitmapCanvas.getContext('2d');

		            const background = async() => {
		               bitmapCtx.fillStyle = '#FFFFFF';
		               bitmapCtx.fillRect(0, 0, vidWidth, vidHeight);
		               return 'success';
		            };

		            const encoder = new GIFEncoder(vidWidth, vidHeight);
		            encoder.setRepeat(0);
		        	encoder.setDelay(frameInterval);
	        		encoder.setQuality(10);

		            let staticFrames='';
		            let frameIndex=0;

		            inputVideo.muted = true;
					inputVideo.loop = false;
					inputVideo.autoplay=true;

					var continueAddFrame=true;

					var frameB64Str='';
					const step = async() => {
						let bgStatus=await background();
						await new Promise(resolve => {
					        bitmapCtx.drawImage(inputVideo, 0, 0, vidWidth, vidHeight);
					        frameB64Str=bitmapCanvas.toDataURL();
					        if(Object.keys(framesToRemove).length===0) {
					        	framesToRemove[frameB64Str]=true;
					        }
					        if(!framesToRemove[frameB64Str]) {
					        	if(continueAddFrame) {
				        			encoder.addFrame(bitmapCtx);
				        		}
				        	}
				        	resolve();
					    });
					    if(!framesToRemove[frameB64Str]) {
						    staticFrames+=`<th><small>Frame #${frameIndex++}</small><br><img src=${frameB64Str} width='75' /></th>`;
						}
					    window.requestAnimationFrame(step);
					};
		        	inputVideo.addEventListener('play', () => {
		        		encoder.start();
		        		step();
					  	window.requestAnimationFrame(step);
		        	});
		        	inputVideo.addEventListener('ended', () => {
		        		clearInterval(toContinueLoading);
		        		continueAddFrame=false;
		        		loadingBar.innerHTML='';
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
			            htmlStr+=`<th colspan='2' class='imageBg'><h4>🎬 Output GIF</h4><img id='outputGif' src='${b64Str}' alt='${fileName}' /><div class='table-responsive'><table><tr align='center'>${staticFrames}</tr></table></div></th>`;
			            htmlStr+='</tr>';
			            htmlStr+='</thead>';

			            htmlStr+='<tbody>';
			            htmlStr+='<tr>';
			            htmlStr+='<td>ℹ '+[
			            					`Type: <b>${fileType}</b>`, 
			            					`Size: <b>${fileSize} ㎅</b>`, 
			            					`# of Frame(s): <b>${frameIndex}</b>`,
			            					`Frame (ᴡ ⨯ ʜ): <b>${ parseInt(vidWidth)} ᵖˣ ⨯ ${vidHeight} ᵖˣ</b>`,
			            					`${dwnlnk.outerHTML}`
			        					].join(' │ ') +'</td>'; 
			            htmlStr+='</tr>';
			            htmlStr+='</tbody>';
			            inputVideoDetails.insertAdjacentHTML('afterend', htmlStr);
		        	});
                };
           } // end file-reader onload
           fileredr.readAsDataURL(file);
        }; // end if-else
    }
};