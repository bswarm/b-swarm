/*
 * Simple JobHandler implementation 
 * sends back the same data it received 
 * 
 *		var job ={
 *			name:"echo",
 *			data:"some dummy text",
 *			no:1,
 *			timeout:1000
 *		};
 *  
 */

function EchoJob(selector,active){
	this.name = "echo"; // mandatory !!!
	this.ready = false; // mandatory !!!
	this.active = false; // mandatory !!!
	this.selector = selector; 
	if(active==true){
		this.active=true;
	}
}

// public method - called by jobManager

EchoJob.prototype.init = function(dataChunks){
	var self = this;
	var html = 
		'<table>'+
		'<tr>'+
			'<td>'+
				'<label for="echoStatus">Status</label><br />'+
				'<textarea id="echoStatus" />'+
			'</td>'+
		'</td>'+
		'<td>'+
			'<label for="echoText">Put some text</label><br />'+
			'<textarea id="echoText"></textarea><br />'+
			'<form class="form-inline">'+
			'<button id="sendJob" class="btn btn-success">Send job to</button>'+
			'<input type="text" id="echoNo" value="1" class="input-mini" > clients'+
			'</form>'+
		'</td>'+
		'<td>'+
			'<label for="echoResponse">Results</label><br />'+
			'<textarea id="echoResponse"></textarea>'+
			'<button id="echoResponseClear" class="btn">Clear</button>'+
		'</td>'+
		'<td>'+
			'<label for="echoDataStats">Data statistics</label><br />'+
			'<div id="echoDataStats" />';	
		'</td>'+
		'<tr>'+
		'<table>';
	
	$(this.selector).html(html);
	
	this.setReady(false);

	this.print("Initializing ...");
	
	$("#sendJob").click(function(e){
		e.preventDefault();
		var N = $("#echoNo").val(); 
		for(var i=0;i<N;i++){
			self.submitJob($("#echoText").val());
		}
	});
	
	$("#echoResponseClear").click(function(e){
		e.preventDefault();
		$("#echoResponse").text("");
	});

	this.setReady(true);
};

EchoJob.prototype.submitJob = function(s){
	var self = this;
	var job ={
			name:self.name,
			data:s,
			no:1,
			timeout:1000
	};
	this.sendJob(job);
};

EchoJob.prototype.handleResult = function(job){
	logger.info("Got results from "+job.doneBy);
	this.print("Got results from "+job.doneBy);
	$("#echoResponse").prepend(job.data+"\n");
};

EchoJob.prototype.handleJob = function(job,callback){
	// This job is trivial and doing it as a webworker seems ridiculous 
	// It is only to ilustrate how to do it for heavy jobs where use of webworker is a MUST 
	var worker = new Worker('js/jobs/echo.js');
	worker.addEventListener('message', function(e) {
		var job = e.data;  
		job.status = "success";
		// execute callback when job done
		callback(job);
	}, false);
	worker.postMessage(job); 
};

EchoJob.prototype.dataStatus = function(stats){
	$("#echoDataStats").html("Nothing to report as this job has no static data");
};


// private method 

EchoJob.prototype.setReady = function(state){
	this.ready = state;
	if(state){
		this.print("READY");
		$(this.selector).removeClass("notReady").addClass("ready");
	}else{
		this.print("NOT READY");
		$(this.selector).removeClass("ready").addClass("notReady");
	}
};

EchoJob.prototype.print = function(msg){
	$("#"+this.name+"Status").append(msg+"\n");
	$("#"+this.name+"Status").get(0).scrollTop = $("#"+this.name+"Status").get(0).scrollHeight;
};


// When used as worker

self.addEventListener('message', function(e) {
	var job = e.data;
	job.data = "Echo "+ job.data;
	self.postMessage(job);
	this.close();
}, false);
