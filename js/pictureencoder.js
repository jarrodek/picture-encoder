/* global fetch */

var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};
gdg.dev.img64.imageworker = gdg.dev.img64.imageworker || {};

gdg.dev.img64.imageworker.queue = [];
gdg.dev.img64.imageworker._tmpQueue = null;
gdg.dev.img64.imageworker.running = false;
gdg.dev.img64.imageworker.runQueue = function(sources, tabid){
  gdg.dev.img64.imageworker.queue.push({
    'id': tabid,
    'items': sources,
    'results': []
  });
  
  if(gdg.dev.img64.imageworker.running) return;
  gdg.dev.img64.imageworker._run();
};


gdg.dev.img64.imageworker._run = function(){
  gdg.dev.img64.imageworker.running = true;
  if(!gdg.dev.img64.imageworker._tmpQueue){
    gdg.dev.img64.imageworker._tmpQueue = gdg.dev.img64.imageworker.queue.shift();
  }
  if(!gdg.dev.img64.imageworker._tmpQueue){
    gdg.dev.img64.imageworker.running = false;
    return;
  }
  var item = gdg.dev.img64.imageworker._tmpQueue.items.shift();
  if(!item){ //no more items
    delete gdg.dev.img64.imageworker._tmpQueue.items;
    postMessage(gdg.dev.img64.imageworker._tmpQueue);
    gdg.dev.img64.imageworker._tmpQueue = null;
    setTimeout(gdg.dev.img64.imageworker._run, 0);
    return;
  }
  
  if(item.src.indexOf('data:')===0 || item.src === ""){
    //already data url.
    gdg.dev.img64.imageworker._tmpQueue.results.push({
      'data': item.src,
      'item': item
    });
    setTimeout(gdg.dev.img64.imageworker._run, 0);
    return;
  }
  
  
  gdg.dev.img64.imageworker._fetch(item.src)
  .then(gdg.dev.img64.imageworker._read)
  .then(function(data){
    gdg.dev.img64.imageworker._tmpQueue.results.push({
      'data': data,
      'item': item
    });
    setTimeout(gdg.dev.img64.imageworker._run, 0);
  })
  .catch(function(reason){
    gdg.dev.img64.imageworker._tmpQueue.results.push({
      'error': reason.message,
      'item': item
    });
    setTimeout(gdg.dev.img64.imageworker._run, 0);
  });
  
};

gdg.dev.img64.imageworker._fetch = function(src){
  return fetch(src).then(function(response) {
    if(!response.ok) throw new Error("No image in the response");
    var headers = response.headers;
    var ct = headers.get('Content-Type');
    var contentType = 'image/png';
    if(ct !== null){
      contentType = ct.split(';')[0];
    }
    
    return response.blob().then(function(blob){
      return {
        'blob': blob,
        'mime': contentType
      };
    });
  });
};

gdg.dev.img64.imageworker._read = function(response){
  return new Promise(function(resolve, reject){
    var blob = new Blob([response.blob], {type : response.mime});
    var reader = new FileReader();
    reader.onload = function(e){
      resolve(e.target.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


gdg.dev.img64.imageworker.onMessage = function(event){
  gdg.dev.img64.imageworker.runQueue(event.data.sources,event.data.tabid);
};




onmessage = gdg.dev.img64.imageworker.onMessage;