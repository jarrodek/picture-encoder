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
    toEncode.push(uniqueImages[it]);
  }
  
  chrome.runtime.sendMessage({
    'action': 'encode',
    'srcs': toEncode
  });
};

gdg.dev.img64.replaceData = function(rpl){
  var imgs = document.querySelectorAll('img');
  var lenj = imgs.length;
  
  for(var i=0, len=rpl.data.length; i<len; i++){
    var orygSrc = rpl.data[i].src;
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

gdg.dev.img64.initialize();