var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};

gdg.dev.img64.initialize = function(){
  chrome.runtime.onMessage.addListener(gdg.dev.img64.onMessage);
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
  console.log(message, sender);
  
  switch(message.action){
    case 'fill':
      switch(message.type){
        case 'css':
          gdg.dev.img64.insertCssImages(message.result.results);
          break;
        case 'images':
          gdg.dev.img64.insertImages(message.result.results);
          break;
      }
      return false;
  }
  return false;
};

gdg.dev.img64.removeLoader = function(){
  var loading = document.querySelector('#loading');
  if(!loading) return;
  
  loading.parentNode.removeChild(loading);
  document.body.classList.remove('loading');
};


gdg.dev.img64.insertImages = function(arr){
  gdg.dev.img64.removeLoader();
  var template = document.querySelector('#item');
  
  for(var i=0,len=arr.length; i<len; i++){
    var item = arr[i].item;
    var data = arr[i].data;
    var img = '<img src="'+data+'"';
    var css = 'backgroud-image: url(\''+data+'\');\n';
    if(item.width){
      img += ' width="'+item.width+'"';
      css += 'width: '+item.width+'px;\n';
    }
    if(item.height){
      img += ' height="'+item.height+'"';
      css += 'height: '+item.height+'px;';
    }
    for(var j=0, l=item.attr.length; j<l; j++){
      img += ' '+item.attr[j].name+'="'+item.attr[j].value+'"';
    }
    img += '/>';
    gdg.dev.img64.appendRow(template, data, img, css);
  }
};

gdg.dev.img64.insertCssImages = function(arr){
  gdg.dev.img64.removeLoader();
  
};

gdg.dev.img64.appendRow = function(template, data, img, css){
  var _data = template.content.querySelector(".data"),
  _img = template.content.querySelector(".img"),
  _css = template.content.querySelector(".css"),
  _prev = template.content.querySelector(".prev-image");
  
  _data.textContent = data;
  _img.textContent = img;
  _css.textContent = css;
  _prev.src = data;
  
  // Clone the new row and insert it into the table
  var clone = document.importNode(template.content, true);
  var imagesContainer = document.querySelector('#images');
  imagesContainer.appendChild(clone);
};



gdg.dev.img64.initialize();