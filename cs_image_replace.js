var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};

gdg.dev.img64.initialize = function(){
  chrome.runtime.onMessage.addListener(gdg.dev.img64.onMessage);
};


gdg.dev.img64.onMessage = function(message, sender, sendResponse){
  
  if(!message || !message.action) return;
  
  switch(message.action){
    case 'single': 
      gdg.dev.img64.replaceSingle(message);
      break;
    case 'all': 
      gdg.dev.img64.replaceAll(message);
      break;
    case 'all-on-page':
      gdg.dev.img64.replaceAllPage(message);
      break;
    case 'replace':
      gdg.dev.img64.replaceData(message);
      break;
  }
  
  return false;
};

gdg.dev.img64.replaceSingle = function(message){
  if(!message.src || !gdg.dev.img64._isTarget(message)){
    console.warn('A page %s is not a target for %s',window.location.href, message.url);
    return;
  }
  
  var imgs = document.querySelectorAll('img');
  var source;
  for (var i = 0, len = imgs.length; i < len; i++) {
    if(imgs[i].src === message.src){
      source = {
        'src': message.src,
        'width': imgs[i].width,
        'height': imgs[i].height
      };
      break;
    }
  }
  
  if(!source) return;
  
  chrome.runtime.sendMessage({
    'action': 'encode',
    'srcs': [source]
  });
  
};

/**
 * This function will callect all images on the page
 * and will send it to background page for futher processing.
 * 
 * Processed images will replace original ones.
 */
gdg.dev.img64.replaceAll = function(message){
  if(!message.src || !gdg.dev.img64._isTarget(message)){
    console.warn('A page %s is not a target for %s',window.location.href, message.url);
    return;
  }
  
  var imgs = document.querySelectorAll('img');
  var uniqueImages = {};
  for (var i = 0, len = imgs.length; i < len; i++) {
    var src = imgs[i].src;
    if(!(src in uniqueImages)){
      uniqueImages[src] = {
        'src': imgs[i].src,
        'width': imgs[i].width,
        'height': imgs[i].height
      };
    }
  }
  
  var toEncode = [];
  for(var it in uniqueImages){
    toEncode[toEncode.length] = uniqueImages[it];
  }
  
  chrome.runtime.sendMessage({
    'action': 'encode',
    'srcs': toEncode
  });
};

/**
 * Replace all images from current website.
 * It includes images, background images and css images.
 * This function will open parsed images in new tab.
 * 
 * This function will collect all image resources from the page and will send
 * it to the background page for further processing.
 */
gdg.dev.img64.replaceAllPage = function(message){
  var images = [];
  var cssImages = [];
  
  //find all images in the page
  for(var i = 0, len = document.images.length; i<len; i++){
      var item = document.images[i];
      
      var rawsrc = item.getAttribute('src');
      if(rawsrc === "" || rawsrc.indexOf('data:') === 0) {
        continue;
      }
      
      
      var attr = [];
      for(var j=0,l=item.attributes.length;j<l;j++){
        if(item.attributes[j].name === 'src') continue; //don't need this
        attr[attr.length] = {
          'name': item.attributes[j].name,
          'value': item.attributes[j].value
        };
      }
      
      var img = {
        'src': item.src,
        'width': item.width,
        'height': item.height,
        'attr': attr
      };
      images[images.length] = img;
  }
  // find all images in CSS ruless
  for(i = 0, len=document.styleSheets.length; i<len; i++){
    var rules = document.styleSheets[i].rules;
    if(!rules) continue;
    var imagesInSheet = gdg.dev.img64.parseCssRules(rules);
    if(imagesInSheet.length > 0){
        cssImages = cssImages.concat(imagesInSheet);
    }
  }
  chrome.runtime.sendMessage({
    'action': 'encode-page',
    'data': {
      'images': images,
      'cssImages': cssImages
    }
  });
};

gdg.dev.img64.parseCssRules = function(rules){
  var result = [];
  for(var i = 0, len=rules.length; i<len; i++){
    var rule = rules[i];
    //pass if there is no background image directive
    if(rule.cssText.indexOf('background-image') === -1 ){ continue; }
    
    var src = null, width = null, height = null;
    for( var _key in rule.style ){
      //
      // Don't look for "background" property.
      // Chrome already split css "background" rule into all 
      // background-* property
      //
      if(rule.style[_key] === 'background-image'){
        var value = rule.style.getPropertyValue(rule.style[_key]);
        if(value === 'initial' || value === 'none' || value.indexOf('data')!==-1) break;
        if(value.indexOf('url') === -1 ){
          continue;
        }
        //It can be only URL like "url(http://full.image.path/image.jpg)" 
        src = value.substring(4,value.length-1);
      } else if(rule.style[_key] === 'width'){
        width = rule.style.getPropertyValue('width');
      } else if( rule.style[_key] == 'height' ){
        height = rule.style.getPropertyValue('height');
      }
      if(src !== null && width !== null && height !== null){
        //got all we need
        break;
      }
    }
    
    if(src === null){
      // just to be sure
      continue;
    }
    var img = {
      'src': src,
      'width': width !== null ? width : 'auto',
      'height': height !== null ? height : 'auto',
      'selector': rule.selectorText,
      'sheet': rule.parentStyleSheet.href
    };
    result[result.length] = img;
  }
  return result;
};



gdg.dev.img64.replaceData = function(rpl){
  var imgs = document.querySelectorAll('img');
  var lenj = imgs.length;
  
  for(var i=0, len=rpl.data.length; i<len; i++){
    if(rpl.data[i].error){
      
      //TODO??
      continue;
    }
    
    var orygSrc = rpl.data[i].item.src;
    var dataUrl = rpl.data[i].data;
    
    for(var j=0; j<lenj; j++){
      if(imgs[j].src === orygSrc){
        if(imgs[j].dataset['replacedSrc']) continue;
        imgs[j].dataset['replacedSrc'] = orygSrc;
        imgs[j].src = dataUrl;
      }
    }
  }
};


gdg.dev.img64._isTarget = function(message){
  return window.location.href === message.url;
};




/*TOAST:  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: rgba(0,0,0,0.80);
  color: #fff;
  padding: 12px 24px;
  transition: bottom 0.35s ease-in-out;
  font-size: 16px;
  font-weight: 300;
  font-family: sans-serif;*/

gdg.dev.img64.initialize();