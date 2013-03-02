"use strict";

var lst = new LocalStorageTester();

var PREFIX = "b-swarm"; 
var logger = {
		info:function(msg){
			if(console.log){
				console.log(msg);
			}
		},
		print:function(msg){
			$("#operation").prepend(msg+"\n");
		}
};


function saveClient(client){
	  localStorage.setItem(PREFIX+"client",JSON.stringify(client));
}

function displayClient(client){
	var html = [client.id];
	$("#client").html(html.join(""));  
}

function getClient(){
	var client = {
				id:null,
				localStorageSupport:false,
				hasData:false,
				supportedHandlerList:{}
	};
	
	  
	if(lst.isAvailable("x","x")){
		  if(localStorage.getItem(PREFIX+"client")){
			  client = JSON.parse(localStorage.getItem(PREFIX+"client"));
		  }
		  client.localStorageSupport = true;
		  
		  if(localStorage.getItem(PREFIX+"data")){
		  	  client.hasData = true;
		  }else{
			  client.hasData = false;
		  }
		  client.localStorageSpace = lst.howMuchIsAvailableChunks(); 
		  if(!client.supportedHandlerList){
			  client.supportedHandlerList={};
		  }
	}
	return client;
}
