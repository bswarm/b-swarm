![alt text](public/img/b-swarm.png "Title")

B-swarm shows how use javascript to connect N browsers in a swarm which can solve a bigger computation problem in reasonable time. In b-swarm architecture each node in the same time can submit and compute tasks.


###[Users section](#users) 
[overview](#overview)                   
[demo](#demo)                   
[architecture](#architecture)   
[security](#security)   
[Is this for parasitic computing ?](#parasitic)          

###[Developers section](#developers)  
[How to get you going](#started)  
[Job object parameters](#job-object-parameters) 

###[Credits](#credits)  



##[Users section](id:users)


###[Overview](id:overview)
Currently the project is nothing more than just a demo of what is possible with a little of javascript + web workers + nodejs server. 

###[Demo](id:demo)
Demo [page](http://b-swarm.com) shows several example problems solved using b-swarm environment. In each computation task is split in smaller subtasks which are send to the swarm. Then each subtask result is then send back. And final result is assembled and presented to the user.
###[Architecture](id:architecture)

Coming soon 

###[Security](id:security)

Absolutely not secure at all ;-).
The main problem in distributed computing is to verify the results from individual nodes.
The simple solution is duplication. Send the same job to few different nodes and compare the results - assume that if certain number of nodes returned the same results you can trust that the results is correct.   
**This or any other solution to  verify results is NOT implemented in the current version.**  

###[Is this for parasitic computing ?](id:parasitic)
The short answer is no. The parasitic websites, which without user permission use the CPU power to compute tasks in secret are highly unethical. You should always inform your visitors about the fact that your website is going to do a **"little"** more then just showing funny pictures.  
The purpose of this project is to show what is currently possible to achieve with javascript.  
  

##[Developers section](id:developers)
###[How to get you going](id:started) 

1) First install node environment (ver 0.8.2)
and package manager 

Follow instruction here to install the specyfic version 
<http://ghosttx.com/2012/04/nvm-cheat-sheet-node-version-manager/>

    sudo apt-get install build-essential g++


2) Install git and clone the repo

    sudo apt-get install git-core
    mkdir repo
    cd repo
    git clone https://github.com/szydan/b-swarm.git



3) Then following node modules
    
    apt-get install npm
    npm install clone express@2.5.9 linestream   socket.io@0.9.7 validator node-uuid

At the end the result is something like 

```
clone@0.1.0 node_modules/clone

linestream@0.3.2 node_modules/linestream

validator@0.4.10 node_modules/validator

express@2.5.9 node_modules/express
├── qs@0.4.2
├── mime@1.2.4
├── mkdirp@0.3.0
└── connect@1.9.2 (formidable@1.0.11)

socket.io@0.9.7 node_modules/socket.io
├── policyfile@0.0.4
├── redis@0.7.2 (hiredis@0.1.14)
└── socket.io-client@0.9.7 (xmlhttprequest@1.2.2, uglify-js@1.2.5, active-x-obfuscator@0.0.1, ws@0.4.21)
```

4) for development install [nodeunit](https://github.com/caolan/nodeunit)


    sudo npm install nodeunit -g

To run tests type;
    
    nodeunit test

5) for easy development you might want to install [nodemon](https://github.com/remy/nodemon)

	sudo npm install nodemon -g

then start the application by
	
	nodemon app.js PORT HOST

6) for production you might want to use [forever](https://github.com/nodejitsu/forever)

	sudo npm install forever -g

	forever start app.js PORT HOST 
	forever list
	forever stop 0

More info at:    
<http://blog.nodejitsu.com/keep-a-nodejs-server-up-with-forever>

###[Job object parameters](id:job-object-parameters) 

Job object which is exchanged between clients and the server might contain following 
properties
 
```
job:{
	name:   STRING,    // name of the job
	id:     STRING,    // ID_OF_CLIENT_WHO_REQUESTED_THE_JOB,
	uuid:   STRING,    // assign by the server to identify job 
	doneBy: STRING,    // ID_OF_A CLIENT_WHO_DONE_THE_JOB,
	no:     INT,       // to how many clients send the job (default 1)     
	data:   OBJECT,    // data needed to do the job and results 
				       
				       // all timestmps (milliseconds between midnight of January 1, 1970) 
	ct:     INT        // computation time reported by job manager
	cwt:    INT        // waiting time reported by job manager
	ts1:    INT,       // here server puts the timestamp ms when it received the job
	ts2:    INT,       // here server puts the timestamp when he sent todo job
	ts3:    INT,       // here server puts the timestamp when he received the job results
	ts4:    INT,       // here server puts the timestamp when he sent the job results
	timeout:INT,	   // time in ms after which job should be cancelled 
				       // here client might have a queue of jobs to do 
				       // and before the job will hit the engine might be too late
				       // also if job is computationally intense and client is weak 
				       // it might take too long to complete the job so engine should 
				       // For such intensive jobs engine should 
				       // periodically checks if the job already timed out
}

```

##[Credits](id:credits)

For nice clean fractal code example:   
http://www.framexpeditions.com/~alex2/teaching/mandelbrot/

For evolving pictures example:   
http://alteredqualia.com/visualization/evolve/

For inspiration:    
All people from nodejs community especially folks from [2012 Node Dublin conference](http://www.nodedublin.com/)



