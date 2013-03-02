/*
// for new version of express
var express = require('express')
  , http = require('http');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
*/

var logger= {
		info:function(msg){
			//green
			util.log('\x1B[32m[b-swarm] '+msg+'\x1B[0m');
		},
		warn:function(msg){
			//yellow
			util.log('\x1B[33m[b-swarm] '+msg+'\x1B[0m');
		},
		error:function(msg){
			//red
			util.log('\x1B[31m[b-swarm] '+msg+'\x1B[0m');
		}
};

var port = 4000;
var host = "localhost";

var check = require('validator').check,
	sanitize = require('validator').sanitize,
	util = require('util'),
	clone = require('clone'),
	fs = require('fs'),
 	uuid = require('node-uuid');

if(process.argv.length>2 ){
	try{
		check( process.argv[2] ).isInt();
		port = sanitize( process.argv[2] ).toInt(); 
	}catch(e){
		logger.warn("Try node app.js PORT_NUMBER");
		process.exit(1);
	}
}

if(process.argv.length>3 ){
	try{
		check( process.argv[3] ).is(/^[a-z-.]+$/);
		host = sanitize( process.argv[3] ).ltrim(" "); 
	}catch(e){
		logger.warn("Try node app.js PORT_NUMBER HOST");
		logger.warn("E.g.: ");
		logger.warn("node app.js 4000 example.com");
		process.exit(1);
	}
}


//TODO keep this in database so we can go parallel
var clients = {};
//TODO keep this in database so we can go parallel
var dataTable = {
		dbpedia37:[
	   		{
	   			label:"persondata",
	   			//location:"http://"+host+":"+port+"/data/dbpedia37/persondata_en_##NO##",
	   			//parts:1043,
	   			location:"http://"+host+":"+port+"/data/dbpedia38/persondata_en_##NO##",
	   			parts:1385,
	   			chunkSize:500*1024,
	   			active:[] // 0 mean that currently no client have this part - then the numbers will be updated while clients sign in or confirm they have the part no X
	   		}
	   	]
	};

/*
 * a table to keep track about current jobs 
 * When server receive todo job that job definition should be added to this table 
 * to keep track about the progress, perform validation of results 
 * 
 * Once job is finished, or cancelled by the client, or client disconnects - job should be removed from the table
 */
var currentJobs = {};

setInterval(function(){
	// monitor the size of currentJobs
	// and resend jobs which timed out
	// and drop jobs which where re-sent more than 10 times
	var timed = 0;
	var dropped = 0;
	var now = new Date().getTime();
	for(var hash in currentJobs){
		if(currentJobs.hasOwnProperty(hash)){
			var job = currentJobs[hash];
			if( (now - job.ts1) > job.timeout ){
				//logger.warn("WARNING: "+hash +" " + (now - job.ts1) + " > " +job.timeout + "retried: "+ job.resended );
				// delete the job from currentJob
				delete currentJobs[hash];
				if(job.resended > 10){
					dropped++;
					//logger.error("WARNING: DROPPING job - too many retries");
				}else{
					// rehash it (new uuid)
					job.uuid = uuid.v1();
					// set new ts1
					job.ts1 = now;
					// mark resend 
					job.resended = job.resended + 1;
					//put it into currentJobs
					currentJobs[job.id+job.uuid] = job;
					// resend use sendJobToNClients
					sendJobToNClients(job);
					timed++;
				}
			}
		}
	}
	logger.error("currentJobs, timeouted, dropped:\t"+Object.keys( currentJobs ).length +"\t"+timed+"\t"+dropped);
},5000);

initData();


/*
 * TODO: should count only clients active for the particular job type 
 *       the formula should be different for different type of jobs (workers vs no-workers) 
 */
function shouldResume(){
	return  Object.keys(currentJobs).length <= (Object.keys(clients).length -1) * 1;
	//return  (Object.keys(clients).length -1) * 8 > Object.keys(currentJobs).length;
}

function shouldPause(){
	return  Object.keys(currentJobs).length > (Object.keys(clients).length -1) * 8;  // here ??? some number that should be calculated
																					  // how many is safe ???	
}


var b_swarm_webapp = require('./lib/b-swarm-webapp.js')(host,port);



//for express 2.5.9
//see http://stackoverflow.com/questions/10231688/node-js-socket-io-vs-express-static

var io = require('socket.io').listen(b_swarm_webapp.server,{"log level":1 });


io.sockets.on('connection', function (socket) {

  socket.emit('communication', { status: 'introduce' });
  
  socket.on('communication', function(data){
	  
	  if(data.status=="clear all data"){
		  socket.broadcast.emit('communication',{status:"clear data"});
	 
	  }else if(data.status=="dojob" && data.job){
		// add client id to job object
		data.job.id = socket.client.id;
		data.job.ts1 = new Date().getTime();
		// add unique job id to distinguish 
		// between multiple jobs from one client
		data.job.uuid = uuid.v1(); 
		// set the timeout
		data.job.timeout = data.job.timeout ? data.job.timeout : 30000;
		data.job.resended = 0;
		
		logger.info("Got job todo from: "+data.job.id +" assigned uuid: "+data.job.uuid);

		// TODO: here count only clients active for this kind of job
		// !!!!!!!!!!!!!!!!!!
		// also the formula should be different for different jobs 
		// if job can be run using workers (N-1)*8 < CJ
		// if job can not be run using workers (N-1) <CJ
		if( shouldResume()  && socket.client.pause && socket.client.pause == true){
			socket.client.pause = false;
			logger.error("Resume client:  "+ socket.client.id + "after got job todo");
			socket.emit('communication', { status: 'pause',pause:false} );
		}
		
		if(shouldPause()){
			logger.error("Pausing client: "+ socket.client.id +" after got job todo");
			socket.client.pause = true;
			socket.emit('communication', { status: 'pause',pause:true} );
		}
		
		
		// put the job into currentJobs hash
		currentJobs[data.job.id+data.job.uuid] = data.job;
		
		// not sure is it worth to check to who send the job 
		// for now lets keep it simple 
		// if job has "no" param lets send it to "no" of clients
		// if not lets send to everybody, clients that do not have the right data will just ignore it
		if(data.job.no && _isValidPositiveInt(data.job.no)){
			sendJobToNClients(data.job);
		}else{
			sendJobToAllClients(socket,data.job);
		}

	  }else if(data.status=="jobdone" && data.job){
		
		
		data.job.ts3 =  new Date().getTime();
		if(socket && socket.client && socket.client.id){
				data.job.doneBy = socket.client.id;
				
				// check that job is still in currentJobs table 
				// if not it mean that the job already timed out 
				// and was resend to different client 
				// or client who submitted the job disconnected 
				if( ! currentJobs[data.job.id+data.job.uuid]){
					// simply drop the results
					logger.info("Got job done from "+data.job.doneBy+" but DROP it because job was no longer in currentJobs" );
				}else{
					logger.info("Got job done from "+data.job.doneBy+" emit results back to "+data.job.id);
					var clientSocket = clients[data.job.id];
					// here check that his socket is still there
					// as it can be already offline
					if(clientSocket){
						clientSocket.emit("communication", {status:"jobdone",job:data.job});
					}else{
						logger.info("Got job done from "+data.job.doneBy+" but could not emit back to ["+data.job.id+"] as there is no active client socket");
					}
				}	
		}
		// here remove job from currentJobs
		delete currentJobs[data.job.id+data.job.uuid];
		
		
		// here code to send pause = false
		if( shouldResume() ){
			// emit resume to the client who sent the job
			logger.error("Resume client:  "+data.job.id + " after job done");
			var clientSocket = clients[data.job.id];
			if(clientSocket && clientSocket.client.pause && clientSocket.client.pause == true){
				clientSocket.client.pause = false;
				clientSocket.emit('communication', { status: 'pause',pause:false } );
			}
		}

		
		
	  }else if(data.status=="refresh" && data.client && data.client.id){
		  // here update client, and client data
		  // here if client has data modify data table
			
		  if(data.client.hasData == false && data.client.localStorageSupport ==true && data.client.localStorageSpace > 0){
			  sendFetchData(socket,data.client.localStorageSpace);
		  }

		  
		  if(data.client.hasData == true && data.client.localStorageSupport == true && data.client.data){
				if(socket.client){
					// unregister previous data
					updateDataTable(socket.client,"unregister"); // update dataTable for each chunk
				}
				socket.client = data.client;
				updateDataTable(socket.client,"register"); // update dataTable for each chunk
			}
			
		  broadcastStats(socket);
		  
	  }else if(data.status=="introducing"){
		if(data.client && !data.client.id){
			logger.info("Client introduce NO id");
			// generate user id 
			require('crypto').randomBytes(12, function(ex, buf) {
				
				socket.client = data.client;
				socket.client.id = buf.toString('hex');
				
				if(!clients[socket.client.id]){
					clients[socket.client.id] = socket;
					clients[socket.client.id].client.tabs = 1;
				}else{
				    if(!clients[socket.client.id].client.tabs){
				    	clients[socket.client.id].client.tabs = 1;
				    }else{
				    	clients[socket.client.id].client.tabs++;
				    }
				}
				  
				socket.emit('communication',{status:"save user id",id:socket.client.id});
				broadcastStats(socket);
			});
		}else{
			// store old client - make sure to do a copy here
			var oldClient = clone(socket.client);
			
			socket.client = data.client;
			
			if(!clients[socket.client.id]){
				clients[socket.client.id] = socket;
				clients[socket.client.id].client.tabs = 1; 
				logger.info("id: "+data.client.id+ " introduced");
			}else{
			    if(!clients[socket.client.id].client.tabs){
			    	clients[socket.client.id].client.tabs = 1;
			    	logger.info("id: "+data.client.id +" introduced");
				}else{
			    	clients[socket.client.id].client.tabs++;
			    	logger.info("id: "+data.client.id +" opened another tab");
			    }
			}
			if(data.client.hasData == false && data.client.localStorageSupport ==true && data.client.localStorageSpace > 0){
				sendFetchData(socket,data.client.localStorageSpace);
            }
			
			// here if client has data modify data table
			if(data.client.hasData == true && data.client.localStorageSupport == true && data.client.data){
				// here check that it is not second tab 
				// as if it is we can NOT add this to the dataTable
				if(clients[socket.client.id].client.tabs==1){
					if(oldClient){
						// unregister previous data
						updateDataTable(oldClient,"unregister"); // update dataTable for each chunk
					}
					updateDataTable(socket.client,"register"); // update dataTable for each chunk
				}
			}
				
			  broadcastStats(socket);
		}
	}
	
	
	
	
	
  });

  
  socket.on('disconnect', function () {
	    if (!socket.client) return;

		if(clients[socket.client.id].client.tabs==1){
	    	// delete client 
	    	updateDataTable(socket.client,"unregister"); // update dataTable for each chunk
	    	delete clients[socket.client.id];
	    	// unregister its data
	    }else{
		    if(!clients[socket.client.id].client.tabs){
		    	updateDataTable(socket.client,"unregister"); // update dataTable for each chunk
		    }else{
		    	clients[socket.client.id].client.tabs--;
		    }
	    }

		logger.info("id: "+socket.client.id+" disconnected");
		broadcastStats(socket,false,"disconected "+socket.client.id);
	  });
  
  
});

// TODO: this should be removed - need to refactor dbpedia job 
function sendJobToAllClients(socket,job){
	logger.info("Sending job "+job.id +" to all clients");
	socket.broadcast.emit('communication',{ status:"dojob",job:job});
}

// here important to not re-send the job to the client who submitted it
function sendJobToNClients(job){
	// do it only if number of connected clients > 1
	if(Object.keys(clients).length>1){
		for(var i=0;i<job.no;i++){
			// now sent to "job.no" clients but pick them randomly 
			var r = true;
			while(r){
				for(var clientID in clients){
					if (Math.random() < 0.5){
						// do not send job back to the client who requested it
						if(clientID != job.id){
							var s = clients[clientID];
							logger.info("Sending job "+job.id +" to client "+clientID);
							s.emit('communication',{ status:"dojob",job:job});
							r=false;
							break;
						}
					}
				}
			}
		}
	}
}


function broadcastStats(socket,toAll,status){
	var toAllFlag = true;
	var statusFlag = "broadcast";
	if(toAll){
		toAllFlag = toAll;
	}
	if(status){
		statusFlag = status;
	}
	var totalNoClients = Object.keys(clients).length;
	var currentJobsNo = Object.keys(currentJobs).length;
	
	var statsObject = {
			status:statusFlag,
			clientsNo:totalNoClients,
			currentJobsNo:currentJobsNo,
			dataTable:dataTable
		};
	
	if(toAllFlag){
		// send also to current user
		socket.emit('stats',statsObject);
	}
	socket.broadcast.emit('stats',statsObject);
}


function initData(){
	for(var type in dataTable){
		if(dataTable.hasOwnProperty(type)){
			for(var i=0;i<dataTable[type].length;i++){
				for(var j=0;j<dataTable[type][i].parts;j++){
					dataTable[type][i].active.push(0);
				}
			}
		}
	}
}


function padNo(num, maxSize) {
    var size = ""+maxSize;
	size = size.length;
	
	var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

/*
 * 
 */
// TODO for dbpedia we can not load more then 10 chunks per client as it is slow to load 5MB into triple store 
// on opera loading is really slow 3 chunks is taking 3.3 sec 
// while in comparison on firefox 10 chunks is taking 3.7 sec 
// while chrome is loading 5 chunks in under 2 sec 
// for best user experience also the browser type should be detected 
// and the number of dbpedia chunks should be no more then 3 for opera 
// and no more then 10 for any browser
function computeChunksToDownload(type,no){
	var chunks = [];
	var min = 0;
	while(chunks.length<no){
		for(var i=0;i<dataTable[type].length;i++){
			var chunkDef = dataTable[type][i];
			var active = chunkDef.active;
			// here do not start to look at active array from the start 
			// introduce a random start offset to better distribute different parts to different clients
			// generate  j from range (0 ... active.length)
			for(var j= Math.floor(Math.random() * active.length); j<active.length; j++){
				if(active[j] == min){
					chunks.push({
						label:chunkDef.label,
						type:type,
						part:j,
						location:chunkDef.location.replace("##NO##",j),
					});
				}
				if(chunks.length==no){
					break;
				}
			}
			if(chunks.length==no){
				break;
			}
		}
		min++;
	}
	return chunks;
}


// when user clear data during a session (by hand, should not happen but the users are sometimes nasty ;-) ) and refresh a page
//  we have a situation where the client is unregistered but it has no data
// so the dataTable is out of sync !!!
function updateDataTable(client,op){
	if(client.data){
		for(var i=0;i<client.data.length;i++){
			var chunk = client.data[i];
			for(var j=0;j<dataTable[chunk.type].length;j++){
				var chunkDef = dataTable[chunk.type][j];
				if(chunkDef.label == chunk.label){
					if(op=="register" ){
						chunkDef.active[chunk.part]++;
					}
					if(op=="unregister" && chunkDef.active[chunk.part]  > 0){
						chunkDef.active[chunk.part]--;
					}
				}	
			}	
		}
	}else{
		logger.info("updateDataTable called but client had no data");
	}
}

function sendFetchData(socket,numberOfChunks){
		// Here put some random time before execute computeChunksToDownload
		// it is just for now as we have small number of clients 
		// to prevent issue that many clients gets the same chunks 
		// 500 - 600ms
		setTimeout(function(){
			var chunks = computeChunksToDownload("dbpedia37",numberOfChunks);
			socket.emit('communication',{status:"fetch data",chunks:chunks});
		},Math.floor((Math.random()*500)+100));
}

function _isValidPositiveInt(n){
	return true;
}
