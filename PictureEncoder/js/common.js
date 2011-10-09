BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;

Function.prototype.bind = function(context){
    var slice = Array.prototype.slice;
    function merge(array, args) {
        array = slice.call(array, 0);
        return update(array, args);
    }
    function update(array, args) {
        var arrayLength = array.length, length = args.length;
        while (length--) array[arrayLength + length] = args[length];
        return array;
    }
    var __method = this, args = slice.call(arguments, 1);
    return function() {
        var a = merge(args, arguments);
        return __method.apply(context, a);
    }
}

/**
 * Get image from given URL and return image byte data.
 * After download it's dispatching event 'image.downloaded' with
 * image property with Blob data or 'image.error' when not downloaded
 */
function getImageData(url,callback){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.addEventListener('load', function(e){
        var contentType = 'image/png';
        var headers = this.getAllResponseHeaders().split('\n');
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
        var bb = new BlobBuilder();
        bb.append(this.response);
        var blob = bb.getBlob(contentType);
        callback.success(blob);
    }, true);
    xhr.addEventListener('error', function(e){
        callback.error();
    },true);
    xhr.send();
}