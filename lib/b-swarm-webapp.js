module.exports = function(host,port) {
	
	var crypto = require('crypto');
	var express = require('express'),
	fs = require('fs');
	var server = express.createServer();
  
	//server.use(express.bodyParser());
	server.use(express.static(__dirname + '/../public'));

	//to serve an index 
	server.get('/', function (req, res) {
	   // here pass the port 
		var html = fs.readFileSync(__dirname + '/../index.html').toString();
		html = html.replace("##PORT##",port).replace("##HOST##",host);
		res.writeHead(200, {"Content-Type": "text/html"});
		res.end(html);	
		
		//res.sendfile(__dirname + '/index.html'); save static file with no modifications
	});
	
	server.post('/upload', function (req, res) {
		var base64Encoded =[];
		req.addListener("data", function(chunk) {
			base64Encoded.push(chunk);
		});
	 
		req.addListener("end", function() {
			// do stuff with complete image
			var img = base64Encoded.join('');
			var index = img.indexOf("base64,");
			var type = img.substring(0,index);
			var data = img.substring(index+"base64,".length);
			
			var ext = "png";
			console.log(type);
			if(type.indexOf("image/png")!=-1){
				ext = "png";
			}else if(type.indexOf("image/jpeg")!=-1){
				ext="jpg";
			}
			
			var fileName = crypto.createHash('md5').update(data).digest("hex")+"."+ext;
			var dataBuffer = new Buffer(data, 'base64');
			var newPath = __dirname + "/../public/uploads/"+fileName;
			
			fs.writeFile(newPath, dataBuffer, function(err) {
				  if(err) {
				    var body = 'Error';
				    res.writeHead(500, {
				      'Content-Length': body.length,
				      'Content-Type': 'text/plain' });
				    res.write(body, encoding='utf8');
				    res.end();
				  
				  } else {
				    //print back generated url 
				    var body = "uploads/"+fileName;
				    res.writeHead(200, {
				      'Content-Length': body.length,
				      'Content-Type': 'text/plain' });
				    res.write(body, encoding='utf8');
				    res.end();
				  }
			});
		});
	});	
	
	server.listen(port);

	return {
		server:server
	};
};