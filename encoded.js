var gdg = gdg || {};
gdg.dev = gdg.dev || {};
gdg.dev.img64 = gdg.dev.img64 || {};

gdg.dev.img64.initialize = function(){
  chrome.runtime.onMessage.addListener(gdg.dev.img64.onMessage);
  document.querySelector('.main-container').addEventListener('click', gdg.dev.img64.containerClick);
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
  var fragment = document.createDocumentFragment();
  
  
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
    gdg.dev.img64.appendRow(fragment, template, data, img, css);
  }
  var container = document.querySelector('#images');
  container.appendChild(fragment);
};

gdg.dev.img64.insertCssImages = function(arr){
  gdg.dev.img64.removeLoader();
  
  if(arr.length === 0){
    document.querySelector('#css').style.display = 'none';
    return;
  }
  
  var template = document.querySelector('#item');
  var fragment = document.createDocumentFragment();
  
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
    img += '/>';
    gdg.dev.img64.appendRow(fragment, template, data, img, css);
  }
  var container = document.querySelector('#css');
  container.appendChild(fragment);
};

gdg.dev.img64.appendRow = function(fragment, template, data, img, css){
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
  fragment.appendChild(clone);
};

gdg.dev.img64.containerClick = function(e){
  if(e.target.hasAttribute('selectable')){
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(e.target);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

gdg.dev.img64.initialize();