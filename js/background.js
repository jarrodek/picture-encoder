/* global chrome */

var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};

gdg.dev.img64.contextOptions = [{
  'id': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': chrome.i18n.getMessage('menuImage2Base64'),
  'contexts': ['image']
},{
  'id': '0SdQCH04mmtaKajBxBPTcd4y96yDxHQG',
  'parentId': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': chrome.i18n.getMessage('menuReplaceOneImage'),
  'contexts': ['image']
},{
  'id': 'zrobfeQESkllffSrEuheR8kADqmIPzR8',
  'parentId': 'BNaDGmcInC5gUrj6KRVYDwrd79aVW9jl',
  'title': chrome.i18n.getMessage('menuReplaceAllImages'),
  'contexts': ['image']
},{
  'id': 'cwNDODJvp0NDSkjgpMz78QwB4GEZpLJH',
  'title': chrome.i18n.getMessage('menuAll2base64'),
  'contexts': ['page']
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
    case gdg.dev.img64.contextOptions[3].id:
      action = 'all-on-page';
      break;
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

gdg.dev.img64.workingScripts = [];
gdg.dev.img64.replaceImages = function(info, tab, action){
  var cmd = {
    'action': action,
    'src': info.srcUrl,
    'url': info.pageUrl,
    'frame': info.frameUrl
  };
  
  if(gdg.dev.img64.workingScripts.indexOf(tab.id) !== -1){
    chrome.tabs.sendMessage(tab.id, cmd);
  } else {
    chrome.tabs.executeScript(tab.id, {file: "js/cs_image_replace.js"}, function(){
      gdg.dev.img64.workingScripts.push(tab.id);
      chrome.tabs.sendMessage(tab.id, cmd);
    });
  }
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
    case 'encode-page':
      gdg.dev.img64.encodePage(message.data);
      return false;
  }
  
  return false;
};

gdg.dev.img64.imageWorker = null;
gdg.dev.img64.runQueue = function(sources, tabid){
  if(gdg.dev.img64.imageWorker === null){
    gdg.dev.img64.imageWorker = new Worker('js/pictureencoder.js');
  }
  gdg.dev.img64.imageWorker.onmessage = function (event) {
    var result = event.data;
    if(result.id.indexOf && result.id.indexOf('page') !== -1){
      gdg.dev.img64.reportPage(result);
    } else {
      gdg.dev.img64.reportCS(result);
    }
  };
  gdg.dev.img64.imageWorker.onerror = function(cause){
    gdg.dev.img64.reportError(cause.message, tabid);
  };
  
  gdg.dev.img64.imageWorker.postMessage({
    'sources': sources,
    'tabid': tabid
  });
};


gdg.dev.img64.reportCS = function(data){
  var cmd = {
    'action': 'replace',
    'data': data.results
  };
  chrome.tabs.sendMessage(data.id, cmd);
};
gdg.dev.img64.reportPage = function(data){
  var id = data.id.substr(5);
  var tabid, type;
  if(id.indexOf('images/') === 0){
    tabid = id.substr(7);
    type = 'images';
  } else if (id.indexOf('css/') === 0){
    tabid = id.substr(4);
    type = 'css';
  } else {
    //error
    console.error("Unknow data to process", data);
    return;
  }
  try{
    tabid = parseInt(tabid);
  }catch(e){
    console.error(e);
    return;
  }
  
  var cmd = {
    'action': 'fill',
    'result': data,
    'type': type
  };
  chrome.tabs.sendMessage(tabid, cmd);
};

gdg.dev.img64.reportError = function(message, tabid){
  var cmd = {
    'action': 'error',
    'message': message
  };
  chrome.tabs.sendMessage(tabid, cmd);
};

gdg.dev.img64.encodePage = function(data){
  //
  chrome.tabs.create({
    'url': 'encoded.html#initialize'
  }, function(tab){
    window.setTimeout(function(){
      gdg.dev.img64.runQueue(data.images, 'page/images/'+tab.id);
      gdg.dev.img64.runQueue(data.cssImages, 'page/css/'+tab.id);
    }, 0);
  });
};



gdg.dev.img64.initialize();