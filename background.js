var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};

gdg.dev.img64.contextOptions = [{
  'id': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': 'Image to base64',
  'contexts': ['image']
},{
  'id': '0SdQCH04mmtaKajBxBPTcd4y96yDxHQG',
  'parentId': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': 'Replace this image',
  'contexts': ['image']
},{
  'id': 'zrobfeQESkllffSrEuheR8kADqmIPzR8',
  'parentId': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': 'Replace all images',
  'contexts': ['image']
}];

gdg.dev.img64.initialize = function(){
  
  for(var i=0, len=gdg.dev.img64.contextOptions.length; i<len; i++){
    console.log('Adding menu item', gdg.dev.img64.contextOptions[i]);
    chrome.contextMenus.create(gdg.dev.img64.contextOptions[i]);
  }
  
  chrome.contextMenus.onClicked.addListener(gdg.dev.img64.contextCallback);
  chrome.runtime.onMessage.addListener(gdg.dev.img64.onMessage);
};

gdg.dev.img64.contextCallback = function(info, tab){
  var action;
  switch(info.menuItemId){
    case gdg.dev.img64.contextOptions[2].id:
      action = 'all';
      break;
    case gdg.dev.img64.contextOptions[1].id:
      action = 'single';
      break;
    default: return;
  }
  gdg.dev.img64.replaceImages(info, tab, action);
};


gdg.dev.img64.replaceImages = function(info, tab, action){
  chrome.tabs.executeScript(tab.id, {file: "cs_image_replace.js"}, function(){
    var cmd = {
      'action': action,
      'src': info.srcUrl,
      'url': info.pageUrl,
      'frame': info.frameUrl
    };
    
    chrome.tabs.sendMessage(tab.id, cmd);
  });
};


gdg.dev.img64.onMessage = function(message, sender, sendResponse){
  if(sender.id !== chrome.runtime.id) {
    console.warn('This extension do not allow external connections yet.');
    return;
  }
  
  if(!message || !message.action) {
    console.warn('Message received but no action specified.', message, sender);
    return;
  }
  
  if(!sender.tab || !sender.tab.id){
    console.warn('Request sent not from a tab but only tabs are supported.', sender.tab);
    return;
  }
  
  switch(message.action){
    case 'encode':
      gdg.dev.img64.runQueue(message.srcs, sender.tab.id);
      //return true; //keep port opened.
      return false;
  }
  
  console.log('Inside background page', message, sender);
  return false;
};


gdg.dev.img64.queue = [];
gdg.dev.img64._tmpQueue = null;
gdg.dev.img64.running = false;
gdg.dev.img64.runQueue = function(sources, tabid){
  gdg.dev.img64.queue.push({
    'id': tabid,
    'items': sources,
    'results': []
  });
  
  if(gdg.dev.img64.running) return;
  gdg.dev.img64._run();
};

gdg.dev.img64._run = function(){
  gdg.dev.img64.running = true;
  if(!gdg.dev.img64._tmpQueue){
    gdg.dev.img64._tmpQueue = gdg.dev.img64.queue.shift();
  }
  if(!gdg.dev.img64._tmpQueue){
    gdg.dev.img64.running = false;
    return;
  }
  
  var item = gdg.dev.img64._tmpQueue.items.shift();
  
  if(!item){ //no more items
    gdg.dev.img64.reportCS(gdg.dev.img64._tmpQueue);
    gdg.dev.img64._tmpQueue = null;
    window.setTimeout(gdg.dev.img64._run, 0);
    return;
  }
  
  
  
  gdg.dev.img64.getImageData(item).then(function(result){
    gdg.dev.img64._tmpQueue.results.push({
      'src': item.src,
      'data': result
    });
    window.setTimeout(gdg.dev.img64._run, 0);
  }, function(cause){
    gdg.dev.img64._tmpQueue.results.push({
      'src': item.src,
      'error': cause.message
    });
    window.setTimeout(gdg.dev.img64._run, 0);
  });
  
};

gdg.dev.img64.reportCS = function(data){
  var cmd = {
    'action': 'replace',
    'data': data.results
  };
  chrome.tabs.sendMessage(data.id, cmd);
};


/**
 * 1. Download the image via xhr.
 * 2. Read it's content type and set mime
 * 3. Read file data
 */
gdg.dev.img64.getImageData = function(item){
  
  return gdg.dev.img64._downloadImage(item)
    .then(function(xhr){
      return {
        'mime': gdg.dev.img64._getImageMime(xhr),
        'xhr': xhr
      };
    })
    .then(gdg.dev.img64._getImageData);
};

gdg.dev.img64._downloadImage = function(item){
  return new Promise(function(resolve, reject){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', item.src, true);
    xhr.responseType = 'arraybuffer';
    xhr.addEventListener('load', function(e){
      resolve(e.target);
    });
    xhr.addEventListener('error', function(e){
      reject(e);
    });
    xhr.send();
  });
};



gdg.dev.img64._getImageMime = function(req){
  var contentType = 'image/png';
  var headers = req.getAllResponseHeaders().split('\n');
  if( headers && headers.length > 0 ){
    var len = headers.length;
    for(var i = 0; i<len; i++){
      var header = headers[i];
      if(!header) continue;
      if(header.toLowerCase().indexOf('content-type')===0){
        contentType = header.toLowerCase().substr(14).trim();
        break;
      }
    }
  }
  return contentType;
};

gdg.dev.img64._getImageData = function(res){
  return new Promise(function(resolve, reject){
    
    var worker = new Worker('pictureencoder.js');
    worker.onmessage = function (event) {
      resolve(event.data.result);
    };
    worker.postMessage({
      'data': res.xhr.response,
      'mime': res.mime
    });
    
  });
};


gdg.dev.img64.initialize();