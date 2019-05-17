const express = require('express');
const JSONParser = require('body-parser');
const app = express();

const port = 8080

const fs = require('fs'); 

const DiscoveryV1 = require('ibm-watson/discovery/v1');

const AssistantV2 = require('ibm-watson/assistant/v2');

const assistant = new AssistantV2({
  version: '2019-02-28',
  iam_apikey: 'jP5yGzV5NNzsfS7NG5xmDg96b9Dj6_t0kug5Kg6nEQUM',
  url: 'https://gateway.watsonplatform.net/assistant/api'
});

var sessionId = "";

app.use(JSONParser.urlencoded({extended:true}));

app.get('/', (req, res) => {
	fs.writeFile("logs.txt", 'step one', function(err) {
			if(err) {
				return console.log(err);
			}
		});
res.sendStatus(200);
});

app.post('/', (req, res) => {
	fs.writeFile("logs.txt", 'step one', function(err) {
			if(err) {
				return console.log(err);
			}
		});
});

app.post('/startConversation', (req, res) => {
	//Unpack payload's body into workable object
	//var payloadJSON = JSON.parse(Object.keys(req.body)[0]);
	assistant.createSession({
		assistant_id:'387f67bb-7fbb-4ca5-a175-88e4dbdc17e5'
	}).then(res => {
		sessionId = res.session_id;
		/*
		assistant.message({
		assistant_id: '387f67bb-7fbb-4ca5-a175-88e4dbdc17e5',
		session_id: sessionId,
			input: {
				'message_type': 'text',
				'text': 'Hello'
			}
		})
		.then(res => {
			//console.log(JSON.stringify(res, null, 2));
		})
		.catch(err => {
			console.log(err);
		});*/
	})
	.catch(err => {
		console.log(err);
	});
	res.sendStatus(200);
});

app.post('/continueConversation', (req, res1) => {
	//Unpack payload's body into workable object
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	var chatText = "";
	var chatObject = "";
	assistant.message({
		assistant_id: '387f67bb-7fbb-4ca5-a175-88e4dbdc17e5',
		session_id: sessionId,
			input: {
				'message_type': 'text',
				'text': insertModuleJSON.message
			}
		})
		.then(res => {
			chatText = JSON.stringify(res, null, 2);
			chatObject = JSON.parse(chatText);
			//console.log(chatObject.output.generic[0].text);
			chatText = chatObject.output.generic[0].text + "";
			res1.status(200).send(chatText);
		})
		.catch(err => {
			console.log(err);
		});
		//res.status(200);
		//res.send(chatObject.output.generic[0].text+"");
		
});

app.get('/queryDiscovery', (req, res1) => {
	var discovery = new DiscoveryV1({
	  version: '2019-02-28',
	  iam_apikey: 'VItRjA_lLWhIou2a31mvKTsAtoXZFXvK6q3XuM6t5SzX',
	  url: 'https://gateway.watsonplatform.net/discovery/api'
	});

	var queryParams = {
	  environment_id: 'a81bea55-c449-4499-8c7b-4cd3358ea94d',
	  collection_id: '89949583-2061-48d0-ade2-289ed65a499a',
	  natural_language_query: 'April 3rd 2013',
	  passages:true,
	  passages_count:3
	};

	discovery.query(queryParams)
	  .then(queryResponse => {
		  fs.writeFile("logs.json", JSON.stringify(queryResponse, null, 2), function(err) {
			if(err) {
				return console.log(err);
			}
		});
		res1.status(200).send(JSON.stringify(queryResponse, null, 2));
		//console.log(JSON.stringify(queryResponse, null, 2));
		console.log("Query Complete");
		})
	  .catch(err => {
		console.log('error:', err);
	  });
	  
});

app.listen(port, () => console.log('App is Up'));

