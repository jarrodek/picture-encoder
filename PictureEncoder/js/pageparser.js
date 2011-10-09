
var worker = new Worker('js/pictureencoder.js');
var imageCache = {};
var parseDomain = null;

function loadParserData(){
    chrome.extension.sendRequest({payload: "parser.getdata", hash: window.location.hash.substr(1)}, handlePortResponse);
    function reparse(e){
        var input = document.getElementById('urlValue');
        if(!input.checkValidity()){
            alert('Entered URL is invalid');
            return;
        }
        restoreContainers();
        var r = new RegExp('([^:]{1,})://([^/]{1,})', 'gi');
        var match = input.value.match(r);
        if(match&&match[0]){
            parseDomain = match[0];
        } else {
            parseDomain = null;
        }
        chrome.extension.sendRequest({payload: "parser.reparse", url: input.value}, handlePortResponse);
    }
    document.getElementById('reparse').addEventListener('click', reparse, true);
    document.getElementById('urlValue').addEventListener('keydown', function(e){
        if(e.keyCode && e.keyCode == 13){
            reparse(e);
        }
    }, true);
    function domainFilterHandler(e){
        var selector = 'output.parsed-files li[data-imageurl]';
        if(!this.checked){
            selector += '.hidden';
        }
        var images = document.querySelectorAll(selector);
        var length = images.length;
        for(var i=0; i<length; i++){
            var item = images[i];
            if(!this.checked){
               item.classList.remove('hidden');
               continue;
            }
            if(item.dataset['imageurl'].indexOf(parseDomain)!==0){
                item.classList.add('hidden');
            }
        }
    }
    document.getElementById('domainFilter').addEventListener('click', domainFilterHandler, true);
}

function handlePortResponse(response){
    if(response.data){
        appendExternalResult(response.data);
        if( response.pageUrl ){
            
            var r = new RegExp('([^:]{1,})://([^/]{1,})', 'gi');
            var match = response.pageUrl.match(r);
            if(match&&match[0]){
                parseDomain = match[0];
            }else {
                parseDomain = null;
            }
            document.getElementById('urlValue').value = response.pageUrl;
        }
    } else {
        console.error(response);
        emptyImagesInfo('imagesContainer');
        emptyImagesInfo('cssContainer');
        document.getElementById('urlValue').placeholder = 'Enter url to check';
    }
}
function restoreContainers(){
    var imgs = document.getElementById('imagesContainer');
    var progress = imgs.querySelector('progress');
    progress.max = 0;
    progress.value = 0;
    progress.classList.remove('hidden');
    var info = imgs.querySelector('.no-data');
    if(info){
        info.parentNode.removeChild(info);
    }
    var li = imgs.querySelectorAll('output > ul > li');
    if(li){
        for(var i=0; i<li.length; i++){
            li[i].parentNode.removeChild(li[i]);
        }
    }
    imgs = document.getElementById('cssContainer');
    progress = imgs.querySelector('progress');
    progress.max = 0;
    progress.value = 0;
    progress.classList.remove('hidden');
    info = imgs.querySelector('.no-data');
    if(info){
        info.parentNode.removeChild(info);
    }
    li = imgs.querySelectorAll('output > ul > li');
    if(li){
        for(var i=0; i<li.length; i++){
            li[i].parentNode.removeChild(li[i]);
        }
    }
    var sheetSelector = document.getElementById('stylesheetSelector');
    sheetSelector.innerHTML = '';
    sheetSelector.classList.add('hidden');
    styleSheetList = [];
}


window.parseData = {};
function appendExternalResult(data){
    if( !data ){
        emptyImagesInfo('imagesContainer');
        emptyImagesInfo('cssContainer');
        return;
    }
    if( data.images.length > 0 ){
        window.parseData['images'] = data.images;
        
    } else {
        emptyImagesInfo('imagesContainer');
    }
    if( data.styles.length > 0 ){
        window.parseData['styles'] = data.styles;
    } else {
        emptyImagesInfo('cssContainer');
    }
    if( data.images.length > 0 ){
        startParseImages();
    } else if( data.styles.length > 0 ) {
        startParseCss();
    }
}
function emptyImagesInfo(id){
    var imgs = document.getElementById(id);
    imgs.querySelector('progress').classList.add('hidden');
    var info = document.createElement('p');
    info.className = 'no-data';
    info.innerHTML = 'Section does not contain aby images.';
    imgs.appendChild(info);
}

function startParseImages(){
    var container = document.getElementById('imagesContainer');
    var progress = container.querySelector('progress');
    progress.max = window.parseData['images'].length;
    progress.value = 0;
    parseImage();
}
function startParseCss(){
    var container = document.getElementById('cssContainer');
    var progress = container.querySelector('progress');
    progress.max = window.parseData['styles'].length;
    progress.value = 0;
    parseCss();
}
function parseImage(){
    var container = document.getElementById('imagesContainer');
    var progress = container.querySelector('progress');
    if(!window.parseData['images']){
        progress.classList.add('hidden');
        startParseCss();
        return;
    }
    progress.value = progress.value + 1;
    var obj = window.parseData['images'].shift();
    if(!obj){
        progress.classList.add('hidden');
        startParseCss();
        return;
    }
    var src = obj.src || obj._src;
    
    if(imageCache.hasOwnProperty(src)){
        createImagePosition(imageCache[src],obj);
        return;
    }
    
    getImageData(src, {
        success: function(blob){
            runWorker(blob,obj,true);
        },
        error: function(){}
    });
}
function runWorker(blob,item,image){
    image = image || false;
    worker.onmessage = function (event) {
        var data = event.data;
        if( data.result ){//finished
            var src = item.src || item._src;
            imageCache[src] = data.result;
            if(image)
                createImagePosition(data.result,item);
            else
                createCssPosition(data.result,item);
        } else {
            if(image)
                runNextImage();
            else 
                runNextCss();
        }
    };
    worker.postMessage(blob);
}
function runNextImage(){
    window.setTimeout(function(){
        try{
        parseImage();
        }catch(e){
            console.error(e);
        }
    }, 100);
}
function runNextCss(){
    window.setTimeout(function(){
        try{
        parseCss();
        }catch(e){
            console.error(e);
        }
    }, 100);
}
function createImagePosition(imageData,item){
    //console.log(item)
    var imageSrc = item._src;
    var container = document.getElementById('imagesContainer');
    var ul = container.querySelector('output > ul');
    if( !ul ){
        container.querySelector('output').appendChild( document.createElement('ul') );
        ul = container.querySelector('output > ul');
    }
    var li = document.createElement('li');
    var img = document.createElement('img');
    img.className = 'pic-thumb';
    img.src = imageData;
    li.dataset['imageurl'] = imageSrc;
    li.appendChild(img);
    var nl = document.createElement('br');
    li.appendChild(nl);
    var resInfo = document.createElement('span');
    resInfo.className = 'data-result';
    resInfo.innerHTML = imageData;
    li.appendChild(resInfo);
    var nl2 = document.createElement('br');
    li.appendChild(nl2);
    var details = document.createElement('details');
    var summary = document.createElement('summary');
    summary.innerHTML = 'Use examples';
    details.appendChild(summary);
    var ex1 = document.createElement('span');
    var ex2 = document.createElement('span');
    ex1.className = ex2.className = 'data-result';
    var imgStr = '&lt;img';
    imgStr += ' src="'+imageData+'"';
    imgStr += ' width="'+item._width+'"';
    imgStr += ' height="'+item._height+'"';
    if( item._attributes ){
        for( var attrName in item._attributes ){
            imgStr += ' ' + attrName + '="'+item._attributes[attrName]+'"';
        }
    }
    imgStr += ' /&gt;';
    ex1.innerHTML = imgStr;
    ex2.innerHTML = 'background-image: url('+imageData+'); width: ' + item._width + ( !isNaN(item._width) ? 'px':'' ) + '; height: ' + item._height + ( !isNaN(item._height) ? 'px':'' ) + ';';
    
    var actions1 = document.createElement('span');
    actions1.className = 'section-item-actions';
    var copy1 = document.createElement('a');
    copy1.href = 'javascript:;';
    copy1.innerText = 'Copy to clipboard';
    actions1.appendChild(copy1);
    details.appendChild(actions1);
    
    details.appendChild(ex1);
    var nl3 = document.createElement('br');
    details.appendChild(nl3);
    
    var actions2 = document.createElement('span');
    actions2.className = 'section-item-actions';
    var copy2 = document.createElement('a');
    copy2.href = 'javascript:;';
    copy2.innerText = 'Copy to clipboard';
    actions2.appendChild(copy2);
    details.appendChild(actions2);
    
    details.appendChild(ex2);
    li.appendChild(details);
    ul.appendChild(li);
    
    img.addEventListener('mouseover', showPrevPopup, true);
    img.addEventListener('mouseout', hidePrevPopup, true);
    
    copy1.addEventListener('click', function(e){
        e.preventDefault();
        var value = ex1.innerHTML.replace('&lt;', '<', 'ig');
        value = value.replace('&gt;', '>', 'ig');
        copyToClipboard(value);
    }, true);
    copy2.addEventListener('click', function(e){
        e.preventDefault();
        copyToClipboard(ex2.innerHTML);
    }, true);
    
    runNextImage();
}

function parseCss(){
    var container = document.getElementById('cssContainer');
    var progress = container.querySelector('progress');
    if(!window.parseData['styles'] || window.parseData['styles'].length == 0){
        progress.classList.add('hidden');
        appendStylesheetList();
        return;
    }
    progress.value = progress.value + 1;
    var obj = window.parseData['styles'].shift();
    if(!obj){
        progress.classList.add('hidden');
        appendStylesheetList();
        return;
    }
    var src = obj.src || obj._src;
    if(imageCache.hasOwnProperty(src)){
        createCssPosition(imageCache[src],obj);
        return;
    }
    getImageData(src, {
        success: function(blob){
            runWorker(blob,obj);
        },
        error: function(){}
    });
}

var styleSheetList = [];

function createCssPosition(imageData,item){
    var imageSrc = item._src;
    var container = document.getElementById('cssContainer');
    var ul = container.querySelector('output > ul');
    if( !ul ){
        container.querySelector('output').appendChild( document.createElement('ul') );
        ul = container.querySelector('output > ul');
    }
    var li = document.createElement('li');
    li.dataset['imageurl'] = imageSrc;
    var img = document.createElement('img');
    img.className = 'pic-thumb';
    img.src = imageData;
    li.appendChild(img);
    var nl = document.createElement('br');
    li.appendChild(nl);
    var resInfo = document.createElement('span');
    resInfo.className = 'data-result';
    resInfo.innerHTML = imageData;
    li.appendChild(resInfo);
    var nl2 = document.createElement('br');
    li.appendChild(nl2);
    var details = document.createElement('details');
    var summary = document.createElement('summary');
    summary.innerHTML = 'CSS data';
    details.appendChild(summary);
    
    if(item._width == "auto" && img.naturalWidth){
        item._width = img.naturalWidth;
    }
    if(item._height == "auto" && img.naturalHeight){
        item._height = img.naturalHeight;
    }
    var toList = item._sheet ? item._sheet : '[inline style declaration]';
    if(styleSheetList.indexOf(toList) == -1){
        styleSheetList[styleSheetList.length] = toList;
    }
    li.dataset['stylesheet'] = toList;
    
    var ex1 = document.createElement('div');
    ex1.className = 'sheet-info';
    item._sheet = item._sheet ? '<a href="'+item._sheet+'">'+item._sheet+'</a>' : '[inline style declaration]';
    var html = 'Stylesheet: <span class="sheet-url">'+item._sheet+'</span><br/>';
    html += 'Rule: <span class="sheet-selector">'+item._selector+'</span>';
    ex1.innerHTML = html;
    var ex2 = document.createElement('span');
    ex2.className = 'data-result';
    ex2.innerHTML = 'background-image: url('+imageData+'); width: ' + item._width + ( !isNaN(item._width) ? 'px':'' ) + '; height: ' + item._height + ( !isNaN(item._height) ? 'px':'' ) + ';';
    details.appendChild(ex1);
    var nl3 = document.createElement('br');
    details.appendChild(nl3);
    
    var actions1 = document.createElement('span');
    actions1.className = 'section-item-actions';
    var copy1 = document.createElement('a');
    copy1.href = 'javascript:;';
    copy1.innerText = 'Copy to clipboard';
    actions1.appendChild(copy1);
    details.appendChild(actions1);
    
    details.appendChild(ex2);
    li.appendChild(details);
    ul.appendChild(li);
    
    img.addEventListener('mouseover', showPrevPopup, true);
    img.addEventListener('mouseout', hidePrevPopup, true);
    
    copy1.addEventListener('click', function(e){
        e.preventDefault();
        copyToClipboard(ex2.innerHTML);
    }, true);
    
    runNextCss();
}

function appendStylesheetList(){
    if(styleSheetList.length<2) return;
    var sheetSelector = document.getElementById('stylesheetSelector');
    
    var info = document.createElement("p");
    info.className = 'stylesheets-info';
    info.innerHTML = 'Show images from stylesheet:';
    sheetSelector.appendChild(info);
    
    var ul = document.createElement("ul");
    ul.className = 'stylesheet-selector';
    sheetSelector.appendChild(ul);
    
    function checkboxObserver(e){
        var sheet = this.value;
        var elements = document.querySelectorAll('#cssContainer > .parsed-files > ul > li[data-stylesheet="'+sheet+'"]');
        for( var i = 0; i < elements.length; i++  ){
            var cls = elements[i].classList;
            if(this.checked){
                cls.remove('hidden');
            } else {
                cls.add('hidden');
            }
        }
        
    }
    
    for(var i=0; i<styleSheetList.length; i++){
        var item = styleSheetList[i];
        var li = document.createElement('li');
        var checkbox = document.createElement('input');
        var label = document.createElement('label');
        checkbox.type = 'checkbox';
        checkbox.value = item;
        checkbox.id = 'sheet'+i;
        checkbox.checked = true;
        label.setAttribute('for','sheet'+i);
        label.innerText = item;
        li.appendChild(checkbox);
        li.appendChild(label);
        ul.appendChild(li);
        checkbox.addEventListener('click', checkboxObserver, true);
    }
    
    sheetSelector.classList.remove('hidden');
}
var overTimeoutId = null;
function showPrevPopup(e){
    overTimeoutId = window.setTimeout(createPrevPopup, 500, e.target,e.pageX,e.pageY);
}
const CURSOR_PADDING = 10;
var imagePrevWrapper = null;
function mouseMoveWrapper(e){
    if(imagePrevWrapper==null) return;
    var left = e.pageX + CURSOR_PADDING;    
    var top = e.pageY + CURSOR_PADDING;
    imagePrevWrapper.style.top = top+'px';
    imagePrevWrapper.style.left = left+'px';
}
function createPrevPopup(img,left,top){
    var imageData = img.src;
    var wrapper = document.createElement('div');
    wrapper.className = 'img-prev-wrapper';
    top += CURSOR_PADDING;
    left += CURSOR_PADDING;
    wrapper.style.top = top+'px';
    wrapper.style.left = left+'px';
    var container = document.createElement('div');
    container.className = 'img-prev-container';
    var image = new Image();
    image.src = imageData;
    container.appendChild(image);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);
    imagePrevWrapper = wrapper;
    document.addEventListener('mousemove', mouseMoveWrapper, true);
}
function hidePrevPopup(e){
    if(overTimeoutId != null){
        window.clearTimeout(overTimeoutId);
        overTimeoutId = null;
    }
    if(imagePrevWrapper){
        imagePrevWrapper.parentNode.removeChild(imagePrevWrapper);
        imagePrevWrapper = null;
    }
    document.removeEventListener('mousemove', mouseMoveWrapper, true);
}
function copyToClipboard(txt){
    var helper = document.getElementById('clipboardHelper');
    helper.classList.remove('hidden');
    helper.value = txt;
    helper.select(); 
    if(!document.execCommand("copy")){
        console.error('error to copy data.');
    }
    helper.classList.add('hidden');
}