/*
 * Simple JobHandler implementation 
 * send sparql query to clients, and print received results
 * This job use static data which is a preprocessed dbpedia dump.
 * 
 *		var job ={
 *			name:"dbpedia37"
 *			data:{
 *				query:"SELECT ?name WHERE {
 *		  			?s a <http://xmlns.com/foaf/0.1/Person>;
 *		  			<http://xmlns.com/foaf/0.1/name> ?name}"	
 *			}
 *		};
 *  
 */

function DbpediaJob(selector,active){
	this.name = "dbpedia37";// mandatory !!!
	this.ready = false;		// mandatory !!!
	this.active = false; // mandatory !!!
	this.selector = selector;
	if(active==true){
		this.active=true;
	}
}

// public method 

DbpediaJob.prototype.init = function(dataChunks){
	var self = this;
	
	if(!rdfstore){
		alert("dbpedia37 job require an rdfstore library to be loaded");
		return;
	}
	
	var html = 
		'<table>'+
		'<tr>'+
			'<td>'+
				'<label for="'+this.name+'Status">Status</label><br />'+
				'<textarea id="'+this.name+'Status" />'+
			'</td>'+
			'<td>'+
				'<label for="dbpediaQuery">write a sparql query</label><br />'+
				'<textarea id="dbpediaQuery">'+
					"SELECT ?name ?s WHERE {"+
					"?s a &lt;http://xmlns.com/foaf/0.1/Person&gt;;"+
					"     &lt;http://xmlns.com/foaf/0.1/name&gt; ?name\n"+
					"FILTER("+
						'regex(str(?name),"^Adam","i")'+
   					")\n"+
					'} LIMIT 10'+
				'</textarea><br />'+
				'<button id="dbpediaSendJob" class="btn btn-success">Send</button>'+
			'</td>'+
			'<td>'+
				'<label for="dbpediaResponse">Results</label><br />'+
				'<div id="dbpediaResponse"><table/></div>'+
				'<button id="dbpediaResponseClear" class="btn">Clear</button>'+
			'</td>'+
			'<td>'+
				'<label for="dbpediaDataStats">Data statistics</label><br />'+
				'<div id="dbpediaDataStats" />';
			'</td>'+
		'<tr>'+
		'<table>';
	
	$(this.selector).html(html);
	self.setReady(false);

	self.print("Initializing ...");
	
	if(dataChunks.length >0){
		var start = new Date().getTime();
		
		var allTriples ="";
		for(var i=0;i<dataChunks.length;i++ ){
			allTriples += dataChunks[i].data;
		}
		self.print("Loading "+ dataChunks.length+" chunks of data ...");
		
		// set overwrite:true in case of calling init again 
		rdfstore.connect("js/rdf_store.js", {name:'dbpedia', overwrite:true}, function(success,store) {
			store.load("text/turtle", allTriples, function(success, results) {
				var stop = new Date().getTime();
				self.print("Loaded "+results+" triples in total ("+(stop -start)+"ms).");
				// save reference to the store to be used later by handleJob method
				self.rdfstore = store;
				self.setReady(true);
			});
		});

	}else{
		self.print("WARNING There is no data to load");
		self.print("WARNING This module can not do the job for others but still can ask others to do the job for it.");
	}
	
	$("#dbpediaSendJob").click(function(e){
		e.preventDefault();
		self.submitJob($("#dbpediaQuery").val());
		self.print("Send job - waiting for results");
	});

	$("#dbpediaResponseClear").click(function(e){
		e.preventDefault();
		$("#dbpediaResponse table tr").remove();
	});	
};

DbpediaJob.prototype.submitJob = function(query){
	var self = this;
	var job ={
			name:self.name,
			data:{
				query:query
			},
			timeout:20000
			//no:1 // send to all clients 
			//TODO: hmm not a good idea there has to be a logic which will send it only to N
			// or will keep sending it untill number of results is reached 
	};
	this.sendJob(job);
};

DbpediaJob.prototype.handleResult = function(job){
	logger.info("Got results from "+job.doneBy);
	this.print("Got results from "+job.doneBy);

	// serialize results to table and append 
	// we assume that the results are in ntriples format
	var html = [];
	for(var i=0;i<job.data.length;i++){
		var row = job.data[i];
		
		html.push('<tr>');
		for(var v in row){
			if(row.hasOwnProperty(v)){
				html.push('<td>'+row[v].value+'</td>');
			}
		}
		html.push('</tr>');
	}
	$("#dbpediaResponse table").prepend(html.join(''));
};

DbpediaJob.prototype.handleJob = function(job,callback){
	var self = this;
	var query = job.data.query;
	if(self.ready && query){
		// here self.rdfstore is already a webworker, nice :-) 
		self.rdfstore.execute(query, function(success,results){
			if(success){
				job.data = results;
				job.status = "success";
			}else{
				job.status = "failure";
			}
			callback(job);
		});
	}
};

DbpediaJob.prototype.dataStatus = function(stats){
	if(stats.dataTable){
			var html=[];
			for(var type in stats.dataTable){
				if(stats.dataTable.hasOwnProperty(type)){
					if(type==this.name){
						html.push("<tr><td>"+type+"</td></tr>");
						for(var i=0;i<stats.dataTable[type].length;i++){
							var chunkDef = stats.dataTable[type][i];
							var label = chunkDef.label;
							var total = chunkDef.active.length;
							var count = [];
							
							for(var j=0;j<total;j++){
								var el = chunkDef.active[j];
								while( count[el] == null){
									count.push(0);
								}
								count[el]++;
							}
							
							html.push("<tr><td>"+label+" (total " +total+ "parts)</td><td><ul>");
							for(var k=0;k<count.length;k++){
								
								if(count[k]!=0){
									var percent = this._roundNumber(count[k]/total*100,2);
									var loadedText = '';
									if(k==0){
										loadedText = 'NOT LOADED';
									}else if(k == 1){
										loadedText = 'laoded 1 time';
									}else{
										loadedText = 'laoded '+ k +' time(s)';
									}
									
									html.push('<li class="loaded'+k+'">' + count[k] + ' parts ('+percent+'%) '+loadedText+'</li>');
								}
							}
							html.push("</ul></td></tr>");
						}
					}
				}
			}
			$("#dbpediaDataStats").html(html.join(""));
	  } 
};


// some "private" helper methods

DbpediaJob.prototype.setReady = function(state){
	this.ready = state;
	if(state){
		this.print("READY");
		$(this.selector).removeClass("notReady").addClass("ready");
	}else{
		this.print("NOT READY");
		$(this.selector).removeClass("ready").addClass("notReady");
	}
};


DbpediaJob.prototype.print = function(msg){
	$("#"+this.name+"Status").append(msg+"\n");
	$("#"+this.name+"Status").get(0).scrollTop = $("#"+this.name+"Status").get(0).scrollHeight;
};


DbpediaJob.prototype._roundNumber = function(num, dec) {
	return Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
};



