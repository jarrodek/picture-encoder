chrome.extension.onRequest.addListener(
function(request, sender, sendResponse) {
    if(sender.tab != null) return;
    
    switch(request.payload){
        case 'images.getall':
            var result = getAll();
            sendResponse({data:result});
            break;
        default:
            sendResponse({data:null});
    }
    
});
function getAll(){
    var images = [];
    var cssImages = [];
    var imgsLength = document.images.length;
    for(var i = 0; i<imgsLength; i++){
        var item = document.images[i];
        var img = new ImageObject(); 
        img.src = item.src;
        img.width = item.width;
        img.height = item.height;
        img.attr = item.attributes;
        images[images.length] = img;
    }
    
    var styleSheetsLength = document.styleSheets.length;
    for(i = 0; i<styleSheetsLength; i++){
        var rules = document.styleSheets[i].rules;
        if( !rules ) continue;
        var imagesInSheet = parseRules(rules);
        if(imagesInSheet.length > 0){
            cssImages = cssImages.concat(imagesInSheet);
        }
    }
    return {
        images: images,
        styles: cssImages
    }
}

function parseRules(rules){
    var rulesLength = rules.length;
    var styleSheetUrl = null;
    var result = [];
    for(var i = 0; i<rulesLength; i++){
        var rule = rules[i];
        if( rule.cssText.indexOf('background-image') == -1 ){ continue; }
        
        if( styleSheetUrl == null && rule.parentStyleSheet ){
            styleSheetUrl = rule.parentStyleSheet.href;
        }
        var src = null, width = null, height = null;
        for( var _key in rule.style ){
            //
            // Don't look for "background" property.
            // Chrome already split css "background" rule into all 
            // background-* property
            //
            if( rule.style[_key] == 'background-image' ){
                var value = rule.style.getPropertyValue(rule.style[_key]);
                if(value == 'initial' || value == 'none' || value.indexOf('data')!=-1) break;
                if( value.indexOf('url') == -1 ){
                    continue;
                }
                //can be "url(http://full.image.path/image.jpg)" only (chrome parse style data
                src = value.substring(4,value.length-1);
            } else if( rule.style[_key] == 'width' ){
                width = rule.style.getPropertyValue('width');
            } else if( rule.style[_key] == 'height' ){
                height = rule.style.getPropertyValue('height');
            }
            if(src != null && width != null && height != null){
                break;
            }
        }
        if(src == null){
            continue;
        }
        var img = new CssImageObject(); 
        img.src = src;
        img.width = width != null ? width : 'auto';
        img.height = height != null ? height : 'auto';
        img.selector = rule.selectorText;
        img.sheet = rule.parentStyleSheet.href;
        result[result.length] = img;
        //console.log(img,rule);
    }
    return result;
}

function ImageBase(){
    this._src = null;
    this._width = null;
    this._height = null;
}
ImageBase.prototype = {
    set src(src){
        this._src = src;
    },
    get src(){
        return this._src;
    },
    set width(intVal){
        this._width = intVal;
    },
    get width(){
        return this._width;
    },
    set height(intVal){
        this._height = intVal;
    },
    get height(){
        return this._height;
    }
}

function CssImageObject(){
    ImageBase.call(this);
    this._selector = null;
    this._sheet = null;
}
CssImageObject.prototype = new ImageBase();
CssImageObject.prototype.constructor = CssImageObject;
CssImageObject.prototype.__defineGetter__('selector', function(){
    return this._selector;
});
CssImageObject.prototype.__defineSetter__('selector', function(strVal){
    this._selector = strVal;
});
CssImageObject.prototype.__defineGetter__('sheet', function(){
    return this._sheet;
});
CssImageObject.prototype.__defineSetter__('sheet', function(url){
    this._sheet = url;
});

function ImageObject(){
    ImageBase.call(this);
    this._attributes = [];
}
ImageObject.prototype = new ImageBase();
ImageObject.prototype.constructor = ImageObject;
ImageObject.prototype.__defineGetter__('attr', function(){
    return this._attributes;
});
ImageObject.prototype.__defineSetter__('attr', function(objVal){
    var remove = ['src'/*,'width','height'*/];
    var result = {};
    for(var _key in objVal){
        var attr = objVal[_key];
        if(remove.indexOf(attr.name) == -1){
            result[attr.name] = attr.value;
        }
    }
    this._attributes = result;
});