onmessage = function (event) {
  
  var file = event.data.data;
  var mimeType = event.data.mime;
  var blob = new Blob([file], {type : mimeType});
  
  
  var reader = new FileReader();
  reader.onload = fileLoaded;
  reader.onerror = errorHandler;
  reader.readAsDataURL(blob);
};

function fileLoaded(e){
  postMessage({result:e.target.result});
}
function errorHandler(evt) {
  postMessage({error:evt.target.error.code});
}