"use strict";

function JobManager(clientSelector,socket){
	// about jobs to execute
	this.jobsToExecuteQueue = [];
	this.numberOfActiveWorkers = 0;
	this.MAX_NO_OF_SIMULTANEOUSLY_EXECUTED_JOBS = 8; // if all jobs uses web workers there will be no more than 8 workers running at any time
	this._waitBecauseMaxNoOfJobsWasReached = false;
	
	// about jobs to send
	this.jobsToSendQueue = [];
	this._waitYouCanNotPushMoreJobsToServer = false;
	
	this.jobHandlers = {};
	this.socket = socket;
	this.selector = clientSelector;
	this.init();
}

JobManager.prototype.init = function(){
	var self = this;
	
	var html = 
		'<div class="b-swarm-dashboard-left">'+
		'<table>'+
			'<tr>'+
				'<td>Client id:</td>'+
				'<td id="client"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>No of connected clients</td>'+
				'<td class="connectedClientsNo"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>Current jobs no</td>'+
				'<td class="currentJobsNo"></td>'+
			'</tr>'+
		'<tr>'+
				'<td>Current operations</td>'+
				'<td><textarea id="operation" style="width:100%; height:100px;"></textarea></td>'+
			'</tr>'+
		'</table>'+
		'</div>'+
		'<div class="b-swarm-dashboard-right">'+
			'<button id="clear">clear local data</button>'+
			'<button id="clearAll">clear all data</button>'+
			'<h4>Disable/Enable job handlers</h4>'+
			'<p>By default all hendlers are enabled !</p>'+
			'<ul id="jobHandlerList"/>'+
		'</div>'+
		'<div style="clear:both;"/>';
	
	$(self.selector).html(html);
	
	// channel for statistics
	self.socket.on('stats', function (data) {
		self.dataStatus(data);
  
		if(data.clientsNo){
			$(self.selector+" .connectedClientsNo").text(data.clientsNo);
		}
		if(data.clientsNo && data.clientsNo < 2){
			$(self.selector+" .connectedClientsNo").addClass("onlyOneClient")
		}else{
			$(self.selector+" .connectedClientsNo").removeClass("onlyOneClient")
		}
		
		if(data.currentJobsNo){
			$(self.selector+" .currentJobsNo").text(data.currentJobsNo);
		}
	}); // end of stats channel 
	
	// communication channel 
	self.socket.on('communication', function (data) {

		if(data.status=="introduce"){
	
			var client = getClient();
			displayClient(client);
			self.socket.emit('communication', { status: 'introducing',client:client });
	
	    }else if(data.status=="save user id"){
	
			logger.info("setting ID to: "+data.id);
			var client = getClient();
			client.id = data.id;
			//TODO: each time client is saved it has to be push to the server 
			// so the server knows to which clients it can send the data
			saveClient(client);
			displayClient(client);
			self.socket.emit('communication', { status: 'introducing',client:client });
	
	    
	    }else if(data.status=="pause"){
	    	console.log("SET PAUSE TO: ["+data.pause+"]");
	    	self._waitYouCanNotPushMoreJobsToServer = data.pause;
	    
	    }else if(data.status=="dojob"){
	
	    	self.addJobToExecutionQueue(data.job);
	
	    }else if(data.status=="jobdone"){
	    	
	    	self.handleJobResults(data.job);	
	
	    }else if(data.status=="clear data" ){
	
			localStorage.removeItem(PREFIX+"data");
			var client = getClient();
			displayClient(client);
			self.socket.emit('communication', { status: 'refresh',client:client });
	
	    }else if(data.status=="fetch data" ){
	
			logger.info("chunks: ");
			logger.info(data.chunks);
			// here download each chunk and on success emit a message
			logger.print("Fetching data ("+data.chunks.length+" parts)");
			
			var deferredCollection = [];
			var deferredCollectionData = [];
			for(var i=0;i<data.chunks.length;i++){
				(function(e) {  // here create a copy of i to avoid wrong reference to i
				var chunk = data.chunks[e];
				deferredCollectionData.push(chunk);
				deferredCollection.push($.ajax({
				  url: chunk.location,
				  dataType: "text",
				  success: function(chunkData){
					  logger.print("Fetching "+chunk.location+" done");
			    	  }
			  		}));
				})(i);
			}
			
			$.when.apply(null, deferredCollection).done(function(){
			   var client = getClient();
			   var data = JSON.parse(localStorage.getItem(PREFIX+"data"));
			   if(!data){
				   data = [];
			   }
			   
				
				
				var chunks =[];
				for(var i=0;i<arguments.length;i++){
					var ajaxResp = arguments[i];
					if(ajaxResp[1]=="success"){
						var chunk = deferredCollectionData[i];
						chunks.push(chunk);
						var copiedChunk = $.extend({},chunk);
						copiedChunk.data = ajaxResp[0]; 
						data.push(copiedChunk);
					}	
				}
			
				localStorage.setItem(PREFIX+"data",JSON.stringify(data));
				logger.print("Successfully fetched "+chunks.length+" chunks of data");
				
				client.hasData = true;
				client.data = chunks;
				client.localStorageSpace = lst.howMuchIsAvailableChunks();  // recalculate space
				saveClient(client);
				displayClient(client);
				// here after data being fetched 
				// we have to reload all jobHandlers
				self.reinitJobHandlers();
				
				
				// here send confirmation that client got the data by refreshing itself again 
				self.socket.emit('communication', { status: 'refresh',client:client });
	    	});
	    }
	
	}); //end of communication channel
	
	
	// button events
	$("#clear").click(function(e){
		  e.preventDefault();
	      localStorage.removeItem(PREFIX+"data");
	      self.socket.emit('communication', { status: 'refresh',client:getClient() });
	});

	$("#clearAll").click(function(e){
		  e.preventDefault();
		  localStorage.removeItem(PREFIX+"data");
		  self.socket.emit('communication', { status: 'clear all data'});
		  // here should be refresh
		  self.socket.emit('communication', { status: 'refresh',client:getClient() });
	});
	
	//window where user can choose which jobs he/she wants to run 
	$("#jobHandlerList li input[type='checkbox']").live('change',function(e){
		var active = $(this).is(":checked");
		var name = $(this).val();
		if(active){
			self.enableJobHandler(name);
		}else{
			self.disableJobHandler(name);
		}
	});
};

JobManager.prototype.registerJobHandler = function(jobHandler){
	var self = this;
	// here check the client.supportedHandlerList saved in local storage 
	// if client was enabled earlier set it as enabled
	var client = getClient();
	if(client.supportedHandlerList && client.supportedHandlerList[jobHandler.name]){
		if(client.supportedHandlerList[jobHandler.name]==true){
			jobHandler.active = true;
		}
	}else{
		client.supportedHandlerList[jobHandler.name]=jobHandler.active;
	}
	saveClient(client);
	// grab the static data that belongs to this job if any
	var dataChunks = this._getJobDataChunks(jobHandler.name);

	//here attache method to send the job
	jobHandler.sendJob = function(job){
		self.addJobToSendQueue(job);
	};

	jobHandler.init(dataChunks);

	this.jobHandlers[jobHandler.name] = jobHandler;
	
	this.refreshJobHandlerList();
};

JobManager.prototype.reinitJobHandlers = function(){
	for(var job in this.jobHandlers){
		if(this.jobHandlers.hasOwnProperty(job)){
			var dataChunks = this._getJobDataChunks(this.jobHandlers[job].name);
			var jobHandler = this.jobHandlers[job];
			jobHandler.init(this.socket,dataChunks);
		}
	}	
};

JobManager.prototype.unregisterJobHandler = function(jobName){
	delete this.jobHandlers[jobName];
	this.refreshJobHandlerList();
};

JobManager.prototype.enableJobHandler = function(jobHandlerName){
	this.jobHandlers[jobHandlerName].active=true;
	var client = getClient();
	client.supportedHandlerList[jobHandlerName]=true;
	saveClient(client);
	
	this.refreshJobHandlerList();
};

JobManager.prototype.disableJobHandler = function(jobHandlerName){
	this.jobHandlers[jobHandlerName].active=false;
	var client = getClient();
	client.supportedHandlerList[jobHandlerName]=false;
	saveClient(client);
	this.refreshJobHandlerList();
};

JobManager.prototype.refreshJobHandlerList = function(){
	var html =[];
	for(var job in this.jobHandlers){
		if(this.jobHandlers.hasOwnProperty(job)){
			var jobHandler = this.jobHandlers[job];
			html.push('<li><input type="checkbox" '+(jobHandler.active===true?'checked="checked':'')+'" value="'+jobHandler.name+'"/>'+jobHandler.name+'</li>');
		}
	}	
	$("#jobHandlerList").html(html.join(''));
};


JobManager.prototype.handleJobResults = function(jobResult){
	for(var job in this.jobHandlers){
		if(this.jobHandlers.hasOwnProperty(job)){
			var jobHandler = this.jobHandlers[job];
			// handle results only by one that match name 
			if(jobHandler.active && jobHandler.name == jobResult.name){
				jobHandler.handleResult(jobResult);
				break;
			}
		}
	}
};

JobManager.prototype.addJobToSendQueue = function(jobToSend){
	var self = this;
	this.jobsToSendQueue.push(jobToSend);
	if(!this.ttt){
		setInterval(function(){
			self.sendJobs();
		},100);
	}
};
JobManager.prototype.sendJobs = function(){
	var self = this;
	self.ttt = true;
	if(this.jobsToSendQueue.length > 0 && !this._waitYouCanNotPushMoreJobsToServer){
		if(console){
			console.log("wait 100ms to send another job, queue: "+this.jobsToSendQueue.length);
		}
		var jobToSend = this.jobsToSendQueue.shift(); 
		this.socket.emit('communication', { status: 'dojob',job:jobToSend });
	}	
};

JobManager.prototype.addJobToExecutionQueue = function(jobToProcess){
	jobToProcess.ct = new Date().getTime();
	this.jobsToExecuteQueue.push(jobToProcess);
	this.scheduleJobToExecution();
};

JobManager.prototype.scheduleJobToExecution = function(jobToProcess){
	if(this.jobsToExecuteQueue.length>0 && !this._waitBecauseMaxNoOfJobsWasReached){
		if(this.numberOfActiveWorkers<this.MAX_NO_OF_SIMULTANEOUSLY_EXECUTED_JOBS){
			this.numberOfActiveWorkers++;
			this.executeJob();
		}else{
			// wait FINISH this
			var self = this;
			self._waitBecauseMaxNoOfJobsWasReached = true;
			if(console){
				console.log("wait 100ms");
			}
			setTimeout(function(){
				self._waitBecauseMaxNoOfJobsWasReached = false;
				self.scheduleJobToExecution();
			},100);
		}
	}
};

JobManager.prototype.executeJob = function(){
	var self = this;
	
	if(this.jobsToExecuteQueue.length>0){
		var jobToProcess = this.jobsToExecuteQueue.shift(); 
		for(var job in this.jobHandlers){
			if(this.jobHandlers.hasOwnProperty(job)){
				var jobHandler = this.jobHandlers[job];
				// handle results only by one that match name 
				if(jobHandler.active && jobHandler.name == jobToProcess.name){
					jobToProcess.cwt = new Date().getTime();
					jobHandler.handleJob(jobToProcess,function(job){
						logger.info("Done job for "+job.id);
						logger.info("Sending results back to "+job.id);
						// write computation time
						job.ct = new Date().getTime() - job.ct;
						job.cwt =  new Date().getTime() - job.cwt;
						self.socket.emit("communication", { status: 'jobdone',job:job});	
						// here execute next job
						self.numberOfActiveWorkers--;
						self.scheduleJobToExecution();
					});
					break;
				}
			}
		}
	}
};

JobManager.prototype.dataStatus = function(stats){
	for(var job in this.jobHandlers){
		if(this.jobHandlers.hasOwnProperty(job)){
			var jobHandler = this.jobHandlers[job];
			// handle stats by all 
			jobHandler.dataStatus(stats);
		}
	}
};

JobManager.prototype._getJobDataChunks = function(jobName){
	var chunks =[];
	
	var client = getClient();
	var data = JSON.parse(localStorage.getItem(PREFIX+"data"));

	
	
	if(data && client.hasData && client.data){
		for(var i=0;i<client.data.length;i++ ){
			var dataDef = client.data[i];
			if(dataDef.type = jobName){
				// here access the data piece with index i in localstorage and load it into rdfstore
				var chunk = data[i];
				if(chunk.type == dataDef.type && chunk.part == dataDef.part ){
					chunks.push(chunk);
				}
			}
		}
	}
	return chunks;
};



