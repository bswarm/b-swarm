// based on code from  http://arty.name/localstorage.html
// turn it into worker if possible

"use strict";

function LocalStorageTester(){
	this.init();
}


LocalStorageTester.prototype._repeat = function(string, count) {
    var array = [];
    while (count--) {
    	array.push(string);
    }
    return array.join('');
};


LocalStorageTester.prototype.init =  function(){
	this.n500kB = this._repeat("x", 1024*500);
};

LocalStorageTester.prototype.isAvailable =  function(key,value){
	try {
	    localStorage.setItem(key, value);
	    localStorage.removeItem(key);
	    return true;
	} catch(e) {
	    return false;
	}
};

LocalStorageTester.prototype.howMuchIsAvailableChunks = function(){
	var chunk = "";
	for(var i=0;i<12;i++){
		chunk += this.n500kB;
		if (!this.isAvailable("x",chunk)) {
			return i;
		}
	}
	return i;
};
