/*
 * Simple JobHandler implementation 
 * Job takes as an input:
 * 
 *  image coordinates, data and genom
 *  
 *  var job ={
 *      name:"imageEvolution",
 *      data:{
 *          coordinates:{
 *              dx:dx,dy:dy,w:w,h:h
 *          },	
 *          imageUrl:"",
 *          genome:""
 *          shapesNo:50,
 *          pointsNo:6,
 *          fitness:83.4
 *      },
 *      no:1,
 *      timeout:10000
 *  };
 *
 *
 * it computes the N generations of mutation over the genom and returns 
 * best genom and coordinates and fitness
 *  
 */

function ImageEvolutionJob(selector,active){
	this.name = "imageEvolution"; // mandatory !!!
	this.ready = false; // mandatory !!!
	this.active = false; // mandatory !!!
	this.selector = selector; 
	if(active==true){
		this.active=true;
	}
	
	//
	this.run = false;
	this.goalFitness = 90;
	this.loadedImage = new Image();
	this.startTime;
	this.totalComputaionTime1 = 0;
	this.totalComputaionTime2 = 0;
	this.totalWaitTime = 0;
	this.sentJobsNumber = 0;
	this.gridNoX=4;
	this.gridNoY=4;
	this.sentJobsNumberEl;
	this.executionTimeEl;
	this.computaionTime1El;
	this.computaionTime2El;
	this.totalWaitTimeEl;
	
}

// public method - called by jobManager

ImageEvolutionJob.prototype.init = function(dataChunks){
	var self = this;
	var html = 
		'<table>'+
		'<tr>'+
			'<td>'+
				'<label for="'+this.name+'Status">Status</label><br />'+
				'<textarea id="'+this.name+'Status" />'+
			'</td>'+
		'</td>'+
		'<td>'+
			'<label>Load an image to process:</label><br/>'+
			'<canvas id="'+this.name+'ImageCanvas" style="width:300px;"></canvas><br/>&#8203;'+
			'<input type="file" id="'+this.name+'ImageLoader" name="imageLoader" />'+
			'<form class="form-inline">'+
			'Grid: <input style="width:20px;" type="text" id="'+this.name+'GridNoX" value="'+this.gridNoX+'" > x '+
			'<input style="width:20px;" type="text" id="'+this.name+'GridNoY" value="'+this.gridNoY+'" >'+
			'Goal fitness: <input type="text" id="'+this.name+'GoalFitness" value="'+this.goalFitness+'" class="input-mini" ></br> '+
			'<button id="'+this.name+'SendJob" class="btn btn-success">Start job</button> '+
			'<button id="'+this.name+'Stop" class="btn btn-inverse">Stop</button></br>'+
			'</form>'+
			'Execution time: <span id="'+this.name+'ExecutionTime">0</span><br />'+
			'Computation time 1: <span id="'+this.name+'ComputationTime1">0</span><br />'+
			'Computation time 2: <span id="'+this.name+'ComputationTime2">0</span><br />'+
			'Total wait time: <span id="'+this.name+'TotalWaitTime">0</span><br />'+
			'Sent jobs number: <span id="'+this.name+'SentJobsNumber">0</span><br />'+
			'<a id="'+this.name+'ImageLink" href="">link</a><br/>'+
			
			'<hr />'+
			'<canvas style="display:none;" id="canvas_input" style="width:200px;" />&#8203;'+
			'<canvas style="display:none;" id="canvas_test" style="width:200px;" />&#8203;'+
			'<canvas style="display:none;" id="canvas_best" style="width:200px;" />'+
			'Fitness:<span id="fitness"></span><br />'+
			'Improvements:<span id="step_benefit"></span><br />'+
			'Mutations:<span id="step_total"></span><br />'+
			
		'</td>'+
		'<td>'+
			'<label>Results:</label><br/>'+
			'<canvas id="'+this.name+'ImageResultsCanvas" style="width:300px;"></canvas>&#8203;'+
			'<button id="'+this.name+'ExportResult" class="btn">Export result</button>'+
		'</td>'+
		'<td>'+
			'<label for="'+this.name+'DataStats">Data statistics</label><br />'+
			'<div id="'+this.name+'DataStats" />';	
		'</td>'+
		'<tr>'+
		'<table>';
	
	$(this.selector).html(html);
	this.setReady(false);
	this.executionTimeEl = document.getElementById( this.name+"ExecutionTime");
	this.computationTime1El = document.getElementById( this.name+"ComputationTime1");
	this.computationTime2El = document.getElementById( this.name+"ComputationTime2");
	this.totalWaitTimeEl = document.getElementById( this.name+"TotalWaitTime");
	this.sentJobsNumberEl = document.getElementById( this.name+"SentJobsNumber");
	self.print("Initializing ...");

    // setting empty canvas for results 
	var canvasResults = document.getElementById(this.name+'ImageResultsCanvas');
	self.ctxResults = canvasResults.getContext('2d');

	// setting canvas for input
	var canvas = document.getElementById(this.name+'ImageCanvas');
	self.ctx = canvas.getContext('2d');

	// define onload handler
    self.loadedImage.onload = function(){
        canvas.width = self.loadedImage.width;
        canvas.height = self.loadedImage.height;
        
        // here update canvas css width/height to reflect image proportions
        self.ctx.drawImage(self.loadedImage,0,0);
        
        // here set the result canavas
        canvasResults.width = self.loadedImage.width;
        canvasResults.height = self.loadedImage.height;
        self.ctxResults.fillStyle="white"; 
        self.ctxResults.fillRect(0, 0, canvasResults.width, canvasResults.height); 
        
        // here use build in file server to temporary store an image on the server 
        // so it we have an URL we can pass to each client 
        // instead of pushing the whole image through sockets 
        
        // compute and suggest the grid no 
        
        $("#"+self.name+"GridNoX").val( Math.floor(canvas.width/50) );
        $("#"+self.name+"GridNoY").val( Math.floor(canvas.height/50) );

        $.ajax({
        	url:"upload",
        	type:"post",
        	dataType:"text",
        	data: canvas.toDataURL('image/jpeg',0.95),
        	success:function(res){
        		// here grab generated URL 
        		self.imageURL = res;
        		$("#"+self.name+"ImageLink").attr("href",self.imageURL);
        	},
        	error:function(){}
        });
    };

	
	function handleImage(e){
        var reader = new FileReader();
        reader.onload = function(event){
            self.loadedImage.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
	
	var imageLoader = document.getElementById(this.name+'ImageLoader');
    imageLoader.addEventListener('change', handleImage, false);
    // autoload monalisa
    self.loadedImage.src = "uploads/monalisa.jpg";
    
    
    
    $("#"+this.name+"ExportResult").click(function(e){
    	e.preventDefault();
    	newwindow2=window.open('','name','height='+ (canvasResults.height+50) +',width='+ (canvasResults.width+20));
    	var tmp = newwindow2.document;
    	tmp.write('<html><head><title>exported image</title>');
    	tmp.write('</head><body><p>this is once again a popup.</p>');
    	tmp.write('<img src="'+canvasResults.toDataURL("image/png")+'"/>');
    	tmp.write('</body></html>');
    	tmp.close();
    });
    
    
    $("#"+this.name+"Stop").click(function(e){
    	e.preventDefault();
    	self.run = false;
    });
    	
    $("#"+this.name+"SendJob").click(function(e){
		e.preventDefault();
		//set start time
		self.startTime = self.getTimestamp();
		self.totalComputaionTime1 = 0;
		self.totalComputaionTime2 = 0;
		self.totalWaitTime = 0;
		self.sentJobsNumber = 0;
		
		// reload image
		self.ctx.drawImage(self.loadedImage,0,0);

		try{
			var goalFitnessS = document.getElementById(self.name+'GoalFitness').value;
			self.goalFitness = parseFloat(goalFitnessS);
		}catch(e){
			// do nothing
		}
		
		self.gridNoX = $("#"+self.name+"GridNoX").val();
		self.gridNoY = $("#"+self.name+"GridNoY").val();
		
		var data = self.ctx.getImageData(0, 0, canvas.width, canvas.height);
		self.run = true;
		self._startEvolution(data);
    });

    this.setReady(true);
};

ImageEvolutionJob.prototype.getTimestamp = function() {
    return 0.001*(new Date).getTime();
};

ImageEvolutionJob.prototype.render_nice_time = function(s) {
	if(s<60) {
        return Math.floor(s).toFixed(0)+"s";
    }else if(s<3600) {
        var m = Math.floor(s/60);
        return m+"m"+" "+this.render_nice_time(s-m*60);
    }else if(s<86400) {
        var h = Math.floor(s/3600);
        return h+"h"+" "+this.render_nice_time(s-h*3600);
    }else {
        var d = Math.floor(s/86400);
        return d+"d"+" "+this.render_nice_time(s-d*86400);
    }
};


ImageEvolutionJob.prototype.setReady = function(state){
	this.ready = state;
	if(state){
		this.print("READY");
		$(this.selector).removeClass("notReady").addClass("ready");
	}else{
		this.print("NOT READY");
		$(this.selector).removeClass("ready").addClass("notReady");
	}
};

ImageEvolutionJob.prototype.print = function(msg){
	$("#"+this.name+"Status").append(msg+"\n");
	$("#"+this.name+"Status").get(0).scrollTop = $("#"+this.name+"Status").get(0).scrollHeight;
};

ImageEvolutionJob.prototype.dataStatus = function(stats){
	$("#"+this.name+"DataStats").html("Nothing to report as this job has no static data");
};


ImageEvolutionJob.prototype.handleResult = function(job){
	logger.info("Got results from "+job.doneBy +" computed in: "+(job.ts3-job.ts1) + "resended: "+job.resended);
	this.print("Got results from "+job.doneBy);
	// here use ImageEvolution code to render 
	// computed genome on canvas
	// draw genome
	this.ctxResults.fillStyle = "rgb(255,255,255)";
	this.ctxResults.fillRect(job.data.coordinates.dx, job.data.coordinates.dy, job.data.coordinates.w, job.data.coordinates.h);
    for(var i=0;i<job.data.shapesNo;i++) {
        //draw shape
    	var shape = job.data.genome[i].shape;
    	var color = job.data.genome[i].color;
    	var dx = job.data.coordinates.dx;
    	var dy = job.data.coordinates.dy;
    	
    	this.ctxResults.fillStyle = "rgba("+color.r+","+color.g+","+color.b+","+color.a+")";
    	this.ctxResults.beginPath();
    	this.ctxResults.moveTo( dx + shape[0].x, dy + shape[0].y);
        for(var j=1;j<job.data.pointsNo;j++) {
        	this.ctxResults.lineTo(dx + shape[j].x, dy + shape[j].y);
        }
        this.ctxResults.closePath();
        this.ctxResults.fill();
    }
    // print fitness
    // first draw white rectangle
	var labelFontWidth = Math.floor(Math.min(job.data.coordinates.w, job.data.coordinates.h) / 6);
	if(labelFontWidth<10){
		labelFontWidth = 10;
	}
	this.ctx.fillStyle = "rgb(255,255,255)";
	this.ctx.fillRect(
			job.data.coordinates.dx + 2, 
			job.data.coordinates.dy + job.data.coordinates.h/2 - labelFontWidth -2, 
			labelFontWidth * 3, 
			labelFontWidth + 4);
    
	if(job.data.fitness < this.goalFitness){
		this.ctx.fillStyle = "rgb(255,0,0)";
	}else{
		this.ctx.fillStyle = "rgb(0,255,0)";
	}
	
	
	
	this.ctx.font = 'bold ' + labelFontWidth + 'px sans-serif';
	this.ctx.textBaseline = 'bottom';
	this.ctx.textAlign = 'left';
	this.ctx.fillText(job.data.fitness.toFixed(2), job.data.coordinates.dx + 4 ,job.data.coordinates.dy + job.data.coordinates.h/2);
    
    
    if(this.run && job.data.fitness < this.goalFitness){
		delete job.doneBy;
		delete job.id;
		delete job.uuid;
		this.sendJob(job);
	}
    
    this.executionTimeEl.innerHTML = this.render_nice_time(this.getTimestamp() - this.startTime);
    
    this.totalComputaionTime1 += (job.ts3-job.ts1);
    this.totalComputaionTime2 += job.ct;
    this.totalWaitTime += job.cwt;
    this.sentJobsNumber++;
    this.sentJobsNumberEl.innerHTML   = this.sentJobsNumber;
    this.computationTime1El.innerHTML = this.render_nice_time(this.totalComputaionTime1/1000);
    this.computationTime2El.innerHTML = this.render_nice_time(this.totalComputaionTime2/1000);
    this.totalWaitTimeEl.innerHTML    = this.render_nice_time(this.totalWaitTime/1000);
};

ImageEvolutionJob.prototype.handleJob = function(job,callback){
	var self = this;
	// first download the image and put it on canvas 
	// so we could later use it to compute fitness
	var img = new Image();
	img.onload = function() {
        // hack around onload bug
        if(img.complete) {
        	self.initCanvas(job,img,callback);
        }else {
            setTimeout(function(){
            	self.initCanvas(job,img,callback);
            }, 100);
        }
    };
    img.src = job.data.imageURL;
};


// ====================
// private methods  
//====================

ImageEvolutionJob.prototype.initCanvas = function(job,IMAGE,callback){
	var DEPTH = 4;

    var CANVAS_INPUT = document.getElementById('canvas_input');
    var CONTEXT_INPUT = CANVAS_INPUT.getContext('2d');

    var CANVAS_TEST = document.getElementById('canvas_test');
    var CONTEXT_TEST = CANVAS_TEST.getContext('2d');

    var CANVAS_BEST = document.getElementById('canvas_best');
    var CONTEXT_BEST = CANVAS_BEST.getContext('2d');

    var SUBPIXELS = job.data.coordinates.w * job.data.coordinates.h * DEPTH;
    var NORM_COEF = job.data.coordinates.w * job.data.coordinates.h * 3 * 255;

    CANVAS_INPUT.setAttribute('width',job.data.coordinates.w);
    CANVAS_INPUT.setAttribute('height',job.data.coordinates.h);

    CANVAS_TEST.setAttribute('width',job.data.coordinates.w);
    CANVAS_TEST.setAttribute('height',job.data.coordinates.h);

    CANVAS_BEST.setAttribute('width',job.data.coordinates.w);
    CANVAS_BEST.setAttribute('height',job.data.coordinates.h);

    //draw only portion of an image on the canvas
    CONTEXT_INPUT.drawImage(IMAGE, 
    		job.data.coordinates.dx,job.data.coordinates.dy,
    		job.data.coordinates.w, job.data.coordinates.h,
    		0,0,
    		job.data.coordinates.w, job.data.coordinates.h);
    
    job.data.imageData = CONTEXT_INPUT.getImageData(
    		0,
    		0,
    		job.data.coordinates.w,
    		job.data.coordinates.h); 
    
    
    //=================
    // TODO: ONCE FINISHED THIS HAS TO BE MOVED TO THE WORKER 
    // a little complicated cause canvas
    var ie = new ImageEvolution(job.data.coordinates.w,job.data.coordinates.h);
	ie.setDna(job.data.genome);
	
	
	var run = function(){
		ie.evolve();
		if(ie.COUNTER_TOTAL< job.data.iterationNo){ // these values are empirical ones 
			setTimeout(run,5); // be nice and not freeze user browser leave 5ms 
		}else{
			// 
			delete job.data.imageData;
			job.data.genome = ie.getBestDna();
			job.data.fitness = ie.getBestFitness();
			callback(job);
		}
	};
	setTimeout(run,0);
    
	// WORKER PART ENDS 
	//=================
    
    /*
    // here start worker with all needed data
    var worker = new Worker('js/jobs/imageEvolution.js');
	worker.addEventListener('message', function(e) {
		var job = e.data;  
		job.status = "success";
		// execute callback when job done
		// delete imageData to not transmit back unneccessary payload
		delete job.data.imageData;
		callback(job);
	}, false);
	worker.postMessage(job); 
	*/

};

ImageEvolutionJob.prototype.submitJob = function(dx,dy,w,h,imageURL,genome){
	var self = this;
	var job = {
			name:self.name,
			data:{
				coordinates:{
					dx:dx,
					dy:dy,
					w:w,
					h:h
				},
				imageURL:imageURL,
				genome:genome,
				shapesNo:50,
				pointsNo:6,
				iterationNo:100
			},
			no:1, // ! tells the server to send this job to only one client 
			timeout:10000
	};
	self.sendJob(job);
};

/**
 * split data into blocks according to grid size
 * generate random genom and send for computation
 *
 * @param data
 * @param gridSize
 */

ImageEvolutionJob.prototype._startEvolution = function(data){
	var self = this;
	var width = data.width;
	var height = data.height;
	
	for(var y=0 ; y<self.gridNoY; y++ ){
		for(var x=0 ; x<self.gridNoX; x++ ){
			
			var block_width = Math.floor(width / self.gridNoX + 0.999999);
			var block_height = Math.floor(height / self.gridNoY+ 0.999999);
			var dx = x * block_width;
			var dy = y * block_height;
			var w = block_width;
			var h = block_height;
			
			if(x == self.gridNoX-1){
				//reduce block width if needed for last column blocks
				w = width -  x * block_width; 
			}
			if(y == self.gridNoY -1){
				//reduce block height if needed for last row blocks
				h = height -  y * block_height; 
			}
			
			var ie = new ImageEvolution(w,h);
			var genome = ie.init_dna();
			self.submitJob(dx, dy, w, h, self.imageURL, genome);
			ie=null;
		}
	}
};



/**
 * When used as worker
 * use ImageEvolution to evolve the genome lets say 1000 times 
 */
self.addEventListener('message', function(e) {
	var job = e.data;

	var ie = new ImageEvolution(job.data.coordinates.w,job.data.coordinates.h);
	ie.setDna(job.data.genome);
	
	ie.evolve();
	
	self.postMessage(job);
	this.close();
}, false);



/* all methods needed to evolve images
 * BASED ON http://alteredqualia.com/visualization/evolve/
 *
 * 
	The MIT License
	
	Copyright (c) 2008 AlteredQualia
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	
	2008-12-26 - Fritz Webering - added Gaussian mutations
	2008-12-16 - Martin Breidt  - updated to export SVG data from DNA
 *
 *
 */

function ImageEvolution(iWidth,iHeight){
	this.IWIDTH = iWidth;
	this.IHEIGHT = iHeight;
	this.MAX_SHAPES = 50;    // max capacity
	this.MAX_POINTS = 6;
	this.ACTUAL_SHAPES = this.MAX_SHAPES; // current size
	this.ACTUAL_POINTS = this.MAX_POINTS;
	this.INIT_TYPE = "color"; // random color
	this.INIT_R = 0;
	this.INIT_G = 0;
	this.INIT_B = 0;
	this.INIT_A = 0.001;
	this.DEPTH = 4;
	this.CHANGED_SHAPE_INDEX = 0;
	this.DNA_BEST = new Array(this.MAX_SHAPES);
	this.DNA_TEST = new Array(this.MAX_SHAPES);

	this.SUBPIXELS = this.IWIDTH * this.IHEIGHT * this.DEPTH;
    this.NORM_COEF = this.IWIDTH * this.IHEIGHT * 3 * 255; // maximum distance between black and white images
	
    this.FITNESS_MAX = 999923400656;
    this.FITNESS_TEST = this.FITNESS_MAX;
    this.FITNESS_BEST = this.FITNESS_MAX;
    this.FITNESS_BEST_NORMALIZED = 0; // pixel match: 0% worst - 100% best
    
    this.COUNTER_BENEFIT = 0;
    this.COUNTER_TOTAL = 0;

    
    
    
	// this ones can not be used inside a worker !!!
    this.EL_STEP_TOTAL = document.getElementById("step_total");
    this.EL_STEP_BENEFIT = document.getElementById("step_benefit");
    this.EL_FITNESS = document.getElementById("fitness");

    this.CANVAS_INPUT = document.getElementById('canvas_input');
    this.CONTEXT_INPUT = this.CANVAS_INPUT.getContext('2d');
	
	this.CANVAS_TEST = document.getElementById('canvas_test');
    this.CONTEXT_TEST = this.CANVAS_TEST.getContext('2d');

    // Note: this one is not really needed as we do not have to draw best genome if it is hidden 
    this.CANVAS_BEST = document.getElementById('canvas_best');
    this.CONTEXT_BEST = this.CANVAS_BEST.getContext('2d');
    
    this.DATA_INPUT = this.CONTEXT_INPUT.getImageData(0, 0, this.IWIDTH, this.IHEIGHT).data;
    this.DATA_TEST;
}

ImageEvolution.prototype.setDna = function(dna){
	this.DNA_BEST = dna;
	this.DNA_TEST = this.init_dna();
	
	this.copyDNA(this.DNA_BEST, this.DNA_TEST);
	
	this.drawDNA(this.CONTEXT_TEST, this.DNA_TEST);
	this.drawDNA(this.CONTEXT_BEST, this.DNA_BEST);
	
	this.FITNESS_TEST = this.compute_fitness();
	this.FITNESS_BEST = this.FITNESS_TEST;
};

ImageEvolution.prototype.getBestDna = function(){
	return this.DNA_BEST;
};

ImageEvolution.prototype.getBestFitness = function(){
	return this.FITNESS_BEST_NORMALIZED;
};

ImageEvolution.prototype.copyDNA = function(dna_from, dna_to) {
    for(var i=0;i<this.MAX_SHAPES;i++)
        this.pass_gene_mutation(dna_from, dna_to, i);
};

// changed to not operate on TEST_DNA but instead generate new DNA and return it
ImageEvolution.prototype.init_dna = function() {
    var self = this;
	var dna = new Array(self.MAX_SHAPES);
	for(var i=0;i<self.MAX_SHAPES;i++) {
        var points = new Array(self.MAX_POINTS);
        for(var j=0;j<self.MAX_POINTS;j++) {
            points[j] = {'x':self.rand_int(self.IWIDTH),'y':self.rand_int(self.IHEIGHT)};
        }
        var color = {};
        if(self.INIT_TYPE=="random")
            color = {'r':self.rand_int(255),'g':self.rand_int(255),'b':self.rand_int(255),'a':0.001};
        else
            color = {'r':self.INIT_R,'g':self.INIT_G,'b':self.INIT_B,'a':self.INIT_A};
        var shape = {
        'color':color,
        'shape':points
        };
        dna[i] = shape;
    }
	return dna;
};

ImageEvolution.prototype.rand_int=function(maxval) {
    return Math.round(maxval*Math.random());
};

ImageEvolution.prototype.rand_float=  function(maxval) {
    return maxval*Math.random();
};

ImageEvolution.prototype.clamp = function(val, minval, maxval) {
    if(val<minval) return minval;
    if(val>maxval) return maxval;
    return val;
};




//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ImageEvolution.prototype.pass_gene_mutation = function(dna_from, dna_to, gene_index) {
		dna_to[gene_index].color.r = dna_from[gene_index].color.r;
	    dna_to[gene_index].color.g = dna_from[gene_index].color.g;
	    dna_to[gene_index].color.b = dna_from[gene_index].color.b;
	    dna_to[gene_index].color.a = dna_from[gene_index].color.a;
	
	
		for(var i=0;i<this.MAX_POINTS;i++) {
	        dna_to[gene_index].shape[i].x = dna_from[gene_index].shape[i].x;
	        dna_to[gene_index].shape[i].y = dna_from[gene_index].shape[i].y;
	    }
};

ImageEvolution.prototype.mutateDNA = function(dna_out) {
	this.mutate_medium(dna_out);
};

ImageEvolution.prototype.mutate_medium = function(dna_out) {
    this.CHANGED_SHAPE_INDEX =  this.rand_int(this.ACTUAL_SHAPES-1);

    var roulette = this.rand_float(2.0);

    // mutate color
    if(roulette<1) {
        // red
        if(roulette<0.25) {
            dna_out[this.CHANGED_SHAPE_INDEX].color.r = this.rand_int(255);
        }
        // green
        else if(roulette<0.5) {
            dna_out[this.CHANGED_SHAPE_INDEX].color.g = this.rand_int(255);
        }
        // blue
        else if(roulette<0.75) {
            dna_out[this.CHANGED_SHAPE_INDEX].color.b = this.rand_int(255);
        }
        // alpha
        else if(roulette<1.0) {
            dna_out[this.CHANGED_SHAPE_INDEX].color.a = this.rand_float(1.0);
        }
    }

    // mutate shape
    else {
        var CHANGED_POINT_INDEX = this.rand_int(this.ACTUAL_POINTS-1);

        if(roulette<1.5) {
        	// x-coordinate
            dna_out[this.CHANGED_SHAPE_INDEX].shape[CHANGED_POINT_INDEX].x = this.rand_int(this.IWIDTH);
        }else {
        	// y-coordinate
            dna_out[this.CHANGED_SHAPE_INDEX].shape[CHANGED_POINT_INDEX].y = this.rand_int(this.IHEIGHT);
        }
    }
};

ImageEvolution.prototype.compute_fitness = function() {
    var fitness = 0;

    this.DATA_TEST = this.CONTEXT_TEST.getImageData(0, 0, this.IWIDTH, this.IHEIGHT).data;

    for(var i=0;i<this.SUBPIXELS;++i) {
        if(i%this.DEPTH!=3)
            fitness += Math.abs(this.DATA_INPUT[i]-this.DATA_TEST[i]);
    }

    return fitness;
};

ImageEvolution.prototype.evolve = function(){
    
	this.mutateDNA(this.DNA_TEST);
	// draw it on job canvas 
	this.drawDNA(this.CONTEXT_TEST,this.DNA_TEST);
    // get fitness 
	this.FITNESS_TEST = this.compute_fitness(this.DNA_TEST);
	
	// lower fitness the better
	if(this.FITNESS_TEST < this.FITNESS_BEST) {
        // from test to best
		this.pass_gene_mutation(this.DNA_TEST, this.DNA_BEST, this.CHANGED_SHAPE_INDEX);
        this.FITNESS_BEST = this.FITNESS_TEST;
        this.FITNESS_BEST_NORMALIZED = 100*(1-this.FITNESS_BEST/this.NORM_COEF);
        this.COUNTER_BENEFIT++;

        this.EL_FITNESS.innerHTML = this.FITNESS_BEST_NORMALIZED.toFixed(2)+"%";
        this.EL_STEP_BENEFIT.innerHTML = this.COUNTER_BENEFIT;

        this.drawDNA(this.CONTEXT_BEST, this.DNA_BEST);
    }else {
    	// from best to test
        this.pass_gene_mutation(this.DNA_BEST, this.DNA_TEST, this.CHANGED_SHAPE_INDEX);
    }
	
	this.COUNTER_TOTAL++;
    this.EL_STEP_TOTAL.innerHTML = this.COUNTER_TOTAL;

    //console.log(this.COUNTER_TOTAL);
	/*
    if(this.COUNTER_TOTAL%10==0) {
        var passed = get_timestamp() - LAST_START;
        EL_ELAPSED_TIME.innerHTML = render_nice_time(ELAPSED_TIME+passed);
    }
    if(COUNTER_TOTAL%50==0) {
        var mutsec = (COUNTER_TOTAL-LAST_COUNTER)/(get_timestamp() - LAST_START);
        EL_MUTSEC.innerHTML = mutsec.toFixed(1);
    }
    */
};


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
ImageEvolution.prototype.drawShape = function(ctx, shape, color) {
    ctx.fillStyle = "rgba("+color.r+","+color.g+","+color.b+","+color.a+")";
    ctx.beginPath();
    ctx.moveTo(shape[0].x, shape[0].y);
    for(var i=1;i<this.ACTUAL_POINTS;i++) {
        ctx.lineTo(shape[i].x, shape[i].y);
    }
    ctx.closePath();
    ctx.fill();
};

ImageEvolution.prototype.drawDNA = function(ctx, dna) {
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, this.IWIDTH, this.IHEIGHT);
    for(var i=0;i<this.ACTUAL_SHAPES;i++) {
        this.drawShape(ctx, dna[i].shape, dna[i].color);
    }
};

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~







