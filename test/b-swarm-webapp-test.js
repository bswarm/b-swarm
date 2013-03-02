var http = require('http');

exports.group = {
	setUp: function (callback) {
        this.testPort = 3000;
        this.testHost = "localhost";
		this.b_swarm_webapp = require('../lib/b-swarm-webapp.js')(this.testHost,this.testPort);
		callback();
    },
    tearDown: function (callback) {
        // clean up
    	this.b_swarm_webapp.server.close();
    	callback();
    },
	
    testIndex: function (test) {
		var self = this;
		test.expect(2);
		http.get({
			host: self.testHost,
		    port: self.testPort,
		    path: '/',
		    method: 'GET'
		    }, function(res) {
		    	test.ok(res.statusCode==200);
		    	var pageData = "";
		    	res.setEncoding('utf8');
		    	res.on('data', function (chunk) {
		    		pageData += chunk;
		    	});
				
				res.on('end', function(){
					// look that host and port were properly set 
					test.ok(pageData.indexOf('io.connect(\'http://'+self.testHost+':'+self.testPort+'\')') != -1);
	    	    	test.done();
				});
		});
    },
    
    testCss: function (test) {
    	var self = this;
    	test.expect(1);
    	http.get({
    		host: self.testHost,
    	    port: self.testPort,
    	    path: '/css/styles.css',
    	    method: 'GET'
    	    }, function(res) {
    	    	test.ok(res.statusCode==200);
    	    	test.done();
    	});
    },
    
    testJs: function (test) {
    	var self = this;
    	test.expect(1);
    	http.get({
    		host: self.testHost,
    	    port: self.testPort,
    	    path: '/js/utils.js',
    	    method: 'GET'
    	    }, function(res) {
    	    	test.ok(res.statusCode==200);
    	    	test.done();
    	});
    }
};
