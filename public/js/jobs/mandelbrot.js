/*
 * JobHandler implementation 
 * renders mandelbrot set 
 * 
 *		var job ={
 *			name:"mandelbrot",
 *			... 
 *		};
 *  
 */

function MandelbrotJob(selector,active){
	this.name = "mandelbrot"; // mandatory !!!
	this.ready = false; // mandatory !!!
	this.active = false; // mandatory !!!
	this.selector = selector; 
	if(active==true){
		this.active=true;
	}
}

MandelbrotJob.prototype.init = function(dataChunks){
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
				'<label for="mandelbrotFractal">Mandelbrot fractal</label><br />'+
				'<div id="canvas-container">'+
					'<canvas id="fractal" width="608" height="458"></canvas><br/>'+
				'</div>'+
				'<form class="form-inline">'+
				'<button id="mandelbrotSendJob" class="btn btn-success">Send job</button>'+
				'<input type="text" id="mandelbrotGridNo" value="3" class="input-mini"> grid tiles '+
				'</form>'+
			'</td>'+
			'<td>'+
				'<label for="mandelbrotDataStats">Data statistics</label><br />'+
				'<div id="mandelbrotDataStats" />';	
			'</td>'+
		'<tr>'+
		'<table>';
	
	$(this.selector).html(html);
	this.setReady(false);

	self.print("Initializing ...");
	
	
	// setting whats needed for mandelbrot set computation
	
	this.canvas = document.getElementById("fractal");
	this.ctx = this.canvas.getContext("2d");
	this.row_data = this.ctx.createImageData(this.canvas.width, 1);
	
	this.canvas.addEventListener("click",
		function(event) {
			// taken from stackoverflow 
			var totalOffsetX = 0;
		    var totalOffsetY = 0;
		    var canvasX = 0;
		    var canvasY = 0;
		    var currentElement = this;
	
		    do{
		        totalOffsetX += currentElement.offsetLeft;
		        totalOffsetY += currentElement.offsetTop;
		    }
		    while(currentElement = currentElement.offsetParent)
	
		    canvasX = event.pageX - totalOffsetX;
		    canvasY = event.pageY - totalOffsetY;
		    self.click(canvasX,canvasY);
	}, false);

	/* do not resize on window resize
	window.addEventListener("resize", function(event) {
		self.resize_to_parent();
	}, false);
	*/
	
	this.max_iter = 4096;
	this.escape = 100;

	this.palette = [];
	this.makePalette();
	
	this.nb_workers = 1;
	this.grid_size = $("#mandelbrotGridNo").val();
	this.i_completedWorker = 0;

	
	this.boundaries={
	        x_min:-2.5,
	        x_max:1.5,
	        y_min:-1.5,
	        y_max:1.5
		};

	
	this.j_max = this.boundaries.y_max;
	this.j_min = this.boundaries.y_min;
	this.i_min = this.boundaries.x_min;
	this.i_max = this.boundaries.x_max;

	this.generation = 0;
	this.nextblock = 0;

	$("#mandelbrotSendJob").click(function(e){
		e.preventDefault();
		self.launchMandebrot();
	});
	this.setReady(true);
};

MandelbrotJob.prototype.dataStatus = function(stats){
	$("#mandelbrotDataStats").html("Nothing to report as this job has no static data");
};

MandelbrotJob.prototype.handleResult = function(job){
	logger.info("Got results from "+job.doneBy);
	this.print("Got results from "+job.doneBy);
	
	logger.info("generations "+job.data.generation +" : "+ this.generation);
	
	if (job.data.generation == this.generation) {
		// Interesting data: display it.
		this.draw_block(job.data);
	}
};

MandelbrotJob.prototype.handleJob = function(job,callback){
	var self=this;
	logger.info("Got job todo from "+job.id);
	self.print("Got job todo from "+job.id);
	
	var worker = new Worker('js/jobs/mandelbrot.js');
	worker.addEventListener('message', function(e) {
		if(e.data.status=="done"){
			var job = e.data.data;  
			job.status = "success";
			// execute callback when job done
			callback(job);
			return;
		}else if(e.data.status=="info"){
			logger.info(e.data.data);
			self.print(e.data.data);
		}
	}, false);
	worker.addEventListener("error", function(e){
		var msg = ['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join('');
		logger.info(msg);
		self.print(msg);
	}, false);
	worker.postMessage(job); 
};

// private methods

MandelbrotJob.prototype.draw_block = function(data) {
	var values = data.values;
	var pdata = this.row_data.data;
	var k = 0;
	for ( var j = data.j_start; j < data.j_end; j++) {
		for ( var i = data.i_start; i < data.i_end; i++) {
			pdata[4 * k + 3] = 255;
			if (values[k] < 0) {
				pdata[4 * k] = pdata[4 * k + 1] = pdata[4 * k + 2] = 0;
			} else {
				var colour = this.palette[values[k]];
				pdata[4 * k] = colour[0];
				pdata[4 * k + 1] = colour[1];
				pdata[4 * k + 2] = colour[2];
			}
			k++;
		}
	}
	this.ctx.putImageData(this.row_data, data.i_start, data.j_start);
};


MandelbrotJob.prototype.draw_init_block = function(data) {
	this.ctx.fillStyle = '#ccc'; 
	this.ctx.lineWidth = 0;
	this.ctx.fillRect(data.i_start, data.j_start,
			data.i_end - data.i_start, data.j_end - data.j_start);

	this.ctx.fillStyle = '#fff';
	this.ctx.font = 'bold ' + this.labelFontWidth + 'px sans-serif';
	this.ctx.textBaseline = 'middle';
	this.ctx.textAlign = 'center';
	this.ctx.fillText(data.workerLabel, (data.i_end + data.i_start) / 2,
			(data.j_end + data.j_start) / 2);
};

MandelbrotJob.prototype.block_boundaries = function(ib) {
	var icol = ib % this.grid_size;
	var irow = Math.floor(ib / this.grid_size);

	var b = {
		i_start : icol * this.block_width,
		i_end : (icol + 1) * this.block_width,
		j_start : irow * this.block_height,
		j_end : (irow + 1) * this.block_height,
	};

	return b;
};


MandelbrotJob.prototype.print = function(msg){
	$("#"+this.name+"Status").append(msg+"\n");
	$("#"+this.name+"Status").get(0).scrollTop = $("#"+this.name+"Status").get(0).scrollHeight;
};

MandelbrotJob.prototype.click = function(x, y) {
	var width = this.i_max - this.i_min;
	var height = this.j_max - this.j_min;
	var click_i = this.i_max - width * x / this.canvas.width;
	var click_j = this.j_max - height * y / this.canvas.height;

	this.i_min = click_i - width / 8;
	this.i_max = click_i + width / 8;
	this.j_max = click_j + height / 8;
	this.j_min = click_j - height / 8;
	
	this.launchMandebrot();
};


MandelbrotJob.prototype.makePalette=function() {
	// wrap values to a saw tooth pattern.
	function wrap(x) {
		x = ((x + 256) & 0x1ff) - 256;
		if (x < 0)
			x = -x;
		return x;
	}
	for (var i = 0; i <= this.max_iter; i++) {
		this.palette.push([ wrap(7 * i), wrap(5 * i), wrap(11 * i) ]);
	}
};

MandelbrotJob.prototype.changeBoundaries = function(xmin, xmax, ymin, ymax){
	 if((xmin!=this.boundaries.x_min) || (xmax!=this.boundaries.x_max) || (ymin!=this.boundaries.y_min) || (ymax!=this.boundaries.y_max)){
		 //$('#elapsed-time').html("");
	 }
	 this.boundaries.x_min=xmin;
	 this.boundaries.x_max=xmax;
	 this.boundaries.y_min=ymin;
	 this.boundaries.y_max=ymax;
};

MandelbrotJob.prototype.completed=function(){
    //var nworkers = $('#mandelbrotNo').text();
    //var gridsize = $('#mandelbrotGridNo').text();
    //$('#elapsed-time').html($('#elapsed-time').html()+"\n"+
    // nworkers+"\t"+gridsize+"\t"+(new Date().getTime()-start))
};
MandelbrotJob.prototype.start=function(){
    //start = new Date().getTime()
};

MandelbrotJob.prototype.setReady = function(state){
	this.ready = state;
	if(state){
		this.print("READY");
		$(this.selector).removeClass("notReady").addClass("ready");
	}else{
		this.print("NOT READY");
		$(this.selector).removeClass("ready").addClass("notReady");
	}
};

MandelbrotJob.prototype.launchMandebrot  = function(){
	this.grid_size = $("#mandelbrotGridNo").val();
    // This will resize the canvas and kick off the initial redraw.
    this.resize_to_parent();
};

MandelbrotJob.prototype.resize_to_parent = function() {
	//var cont = $('#canvas-container');
	//this.canvas.width = cont.width();
	//this.canvas.height = window.innerHeight;

	
	// Adjust the horizontal scale to maintain aspect ratio
	var width = ((this.j_max - this.j_min) * this.canvas.width / this.canvas.height);
	var i_mid = (this.i_max + this.i_min) / 2;
	var j_mid = (this.j_max + this.j_min) / 2;

	this.block_width = Math.floor(this.canvas.width / this.grid_size
			+ 0.999999);
	this.block_height = Math.floor(this.canvas.height / this.grid_size
			+ 0.999999);

	this.labelFontWidth = Math.min(this.block_width, this.block_height) / 2;

	this.i_min = i_mid - width / 2;
	this.i_max = i_mid + width / 2;

	// Reallocate the image data object used to draw rows.
	this.row_data = this.ctx.createImageData(this.block_width,this.block_height);

	this.redraw();
};

MandelbrotJob.prototype.redraw = function() {
	this.changeBoundaries(this.i_min, this.i_max, this.j_min, this.j_max);
	//clearing the canvas
	this.canvas.width = this.canvas.width;
	this.generation++;
	this.i_completedWorker = 0;
	this.nextblock = 0;
	this.start();
	
	
	
	for ( var i = 0; i < this.grid_size * this.grid_size; i++) {
		this.process_block();
	}
};

MandelbrotJob.prototype.process_block = function() {
	var self = this;
	var ib = this.nextblock++;
	if (ib >= this.grid_size * this.grid_size) {
		//worker.idle = true;
		// TODO: here think how to decide when completed etc 
		if (++this.i_completedWorker == this.nb_workers) {
			this.completed();
		}
	} else {
		//worker.idle = false;
		var block = this.block_boundaries(ib);
		var data = {
			width : this.block_width,
			height : this.block_height,
			i_start : block.i_start,
			i_end : block.i_end,
			j_start : block.j_start,
			j_end : block.j_end,

			//	      width: this.row_data.width-100,
			generation : this.generation,
			c_min : this.i_max + (this.i_min - this.i_max) * block.i_start
					/ this.canvas.width,
			c_max : this.i_max + (this.i_min - this.i_max) * block.i_end
					/ this.canvas.width,
			r_min : this.j_max + (this.j_min - this.j_max) * block.j_start
					/ this.canvas.height,
			r_max : this.j_max + (this.j_min - this.j_max) * block.j_end
					/ this.canvas.height,
			max_iter : this.max_iter,
			escape : this.escape,
			workerLabel : "sent",
		};
		this.draw_init_block(data);
		this.submitJob(data);
	}
};


MandelbrotJob.prototype.submitJob = function(data) {
	var self = this;
	// here call send job 
	var job = {
			name:self.name,
			data:data,
			no:1, // ! tells the server to send this job to only one client
			timeout:20000
	};
	self.sendJob(job);
};

// When used as worker

self.addEventListener('message', function(e) {
	//self.postMessage({status:"info",data:"worker started"});
	var job = e.data;
	var data = job.data;
	
	var max_iter = data.max_iter;
	var escape = data.escape * data.escape;
	data.values = [];
	for ( var j = data.j_start; j < data.j_end; j++) {
		var c_j = data.r_min + (data.r_max - data.r_min) * (j - data.j_start)/ data.height;
		for ( var i = data.i_start; i < data.i_end; i++) {
			var c_i = data.c_min + (data.c_max - data.c_min) * (i - data.i_start) / data.width;
			var z_j = 0, z_i = 0;
			for (var iter = 0; z_j * z_j + z_i * z_i < escape && iter < max_iter; iter++) {
				// z -> z^2 + c
				var tmp = z_j * z_j - z_i * z_i + c_i;
				z_i = 2 * z_j * z_i + c_j;
				z_j = tmp;
			}
			if (iter == max_iter) {
				iter = -1;
			}
			data.values.push(iter);
		}
	}
	self.postMessage({status:"done",data:job});
	this.close();
}, false);
