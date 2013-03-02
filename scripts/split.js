/*
 * Example usage to split dbpedia file 
 * 
 *  node split.js public/data/dbpedia38/persondata_en.nt.sorted /tmp/ xxx_ 1024000
 *	node split.js public/data/dbpedia38/persondata_en.nt.sorted public/data/dbpedia38/ persondata_en_ 512000 
 */

if(process.argv.length<4){
	console.log("This program splits sorted ntriples files into chunks smaller then certain size");
	console.log("Not enough params. Try:\nnode split.js PATH_TO_SORTED_NTRIPLES_FILE PATH_TO_OUTPUT_FOLDER [CHUNK_NAME_PREFIX] [SIZE_IN_BYTES (default 500*1024)]");
	process.exit(1);
}

var inputFile = process.argv[2];
var folder = process.argv[3];

var filename = "chunk_";
if(process.argv.length>=5 && process.argv[4]!="" ){
	filename = process.argv[4];
}

var chunkSize = 500 * 1024; // 500kB
if(process.argv.length>=6 && process.argv[5]!="" ){
	chunkSize = process.argv[5];
}


var stream = require('linestream').create(inputFile, {bufferSize: 64 * 1024});
var fs = require('fs');

var s = null; 
var ps = null;
var totSize = 0;
var size = 0;
var entityA =[];
var chunkA =[];
var chunkNo = 0;


function saveChunk(filename,data){
	fs.writeFile(filename, data, function(err) {
	    if(err) {
	        console.log(err);
	    } else {
	        //console.log("The file was saved!");
	    }
	}); 

}


stream.on('data', function(line, isEnd) {
	ps = s;
	s = line.split(" ")[0];  
	if(ps!=s){
		//new entity
		var entity = entityA.join("");
		
		
		
		size += entity.length;
		
		if(size <= chunkSize){
			chunkA.push(entity);
		}else{
			// save chunk to file 
			saveChunk(folder+filename+chunkNo,chunkA.join(""));
			chunkNo++;
			size = entity.length;
			// reset chunk array and push the left entity into new chunk
			chunkA = [entity]; 
		}
		// reset entity array
		entityA = [];
	}
	
	entityA.push(line);
	
	if(isEnd){
		var entity = entityA.join(""); 
		size += entity.length;
		chunkA.push(entity);
		// save chunk to file 
		saveChunk(folder+filename+chunkNo,chunkA.join(""));
		console.log("Saved " + chunkNo + " chunks");
	}
});

stream.on('end', function() { // emitted at the end of file
	  console.log('end');
});

stream.on('error', function(e) { // emitted when an error occurred
	  console.error(e);
});