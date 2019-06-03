const express = require('express');
const JSONParser = require('body-parser');
const app = express();

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
	res.sendStatus(200);
});

app.post('/', (req, res) => {
	res.sendStatus(200);
});

app.post('/startConversation', (req, res1) => {
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	var chatText = "";
	var chatObject = "";
	assistant.createSession({
		assistant_id:'387f67bb-7fbb-4ca5-a175-88e4dbdc17e5'
	}).then(res => {
		sessionId = res.session_id;
		
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
			chatText = chatObject.output.generic[0].text + "";
			res1.status(200).send(chatText);
		})
		.catch(err => {
			console.log(err);
		});
	})
	.catch(err => {
		console.log(err);
	});
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
			
			if (chatObject.output.hasOwnProperty("intents")){
				if (chatObject.output.intents[0].intent === "ConversationComplete"){
					chatText = "conversationComplete";
				}
			}
			else{
				chatText = chatObject.output.generic[0].text;
			
				if (chatObject.output.entities.length > 0 && chatText === "Give me a moment to find that report."){
					chatText += ";uniqueDelimiter;" + chatObject.output.entities[0].value;
				}
			}
						
			res1.status(200).send(chatText);
		})
		.catch(err => {
			console.log(err);
		});
		//res.status(200);
		//res.send(chatObject.output.generic[0].text+"");
		
});

app.post('/getDocumentId', (req, res1) => {
	//Unpack payload's body into workable object
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	var reponse;
	var discovery = new DiscoveryV1({
	  version: '2019-02-28',
	  iam_apikey: 'VItRjA_lLWhIou2a31mvKTsAtoXZFXvK6q3XuM6t5SzX',
	  url: 'https://gateway.watsonplatform.net/discovery/api'
	});

	var queryParams = {
	  environment_id: 'a81bea55-c449-4499-8c7b-4cd3358ea94d',
	  collection_id: '89949583-2061-48d0-ade2-289ed65a499a',
	  natural_language_query: insertModuleJSON.filename
	};

	discovery.query(queryParams)
	  .then(queryResponse => {
		  //queryResponse.results[0].extracted_metadata.filename == insertModuleJSON.filename
		  if (queryResponse.results[0]){
			  for (i = 0; i < queryResponse.results.length; i++){
				  if (JSON.stringify(queryResponse.results[i].extracted_metadata.filename) == JSON.stringify(insertModuleJSON.filename)){
					  response = "reportFound;uniqueDelimiter;" + queryResponse.results[i].id;
				  }
			  }
		  }
		  else{
			  response = "reportNotFound;uniqueDelimiter;";
		  }
			res1.status(200).send(response);
		})
	  .catch(err => {
		console.log('error:', err);
	  });
	  
});

app.post('/specificDiscoveryQuery', (req, res1) => {
	//Unpack payload's body into workable object
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	var specificQueryPackage = [];
	var highlightedTerms = [];
	var filteredPassages = [];
	var stringToInspect;
	
	var discovery = new DiscoveryV1({
	  version: '2019-02-28',
	  iam_apikey: 'VItRjA_lLWhIou2a31mvKTsAtoXZFXvK6q3XuM6t5SzX',
	  url: 'https://gateway.watsonplatform.net/discovery/api'
	});

	var queryParams = {
	  environment_id: 'a81bea55-c449-4499-8c7b-4cd3358ea94d',
	  collection_id: '89949583-2061-48d0-ade2-289ed65a499a',
	  natural_language_query: insertModuleJSON.message,
	  passages:true,
	  passages_count:100,
	  highlight:true
	};

	discovery.query(queryParams)
	  .then(queryResponse => {
			var tempCount = 0;
			for (i = 0; i < queryResponse.passages.length; i++){
				if (queryResponse.passages[i].document_id == insertModuleJSON.documentId){
					filteredPassages.push(queryResponse.passages[i]);
					tempCount++;
					if (tempCount == 3){
						break;
					}
				}
			}
			for (i = 0; i < queryResponse.results.length; i++){
				if (queryResponse.results[i].id == insertModuleJSON.documentId){
					if (queryResponse.results[i].highlight.hasOwnProperty("text")){
						for (j = 0; j < queryResponse.results[i].highlight.text.length; j++){
							stringToInspect = queryResponse.results[i].highlight.text[j].split("</em>");
							for (k = 0; k < stringToInspect.length; k++){
								if (stringToInspect[k].includes("<em>")){
									highlightedTerms.push(stringToInspect[k].substring(stringToInspect[k].indexOf("<em>"), stringToInspect[k].length).replace("</em>","").replace("<em>", ""));
								}
							}
						}
					}
					else if (queryResponse.results[i].highlight.hasOwnProperty("answer")){
						for (j = 0; j < queryResponse.results[i].highlight.answer.length; j++){
							stringToInspect = queryResponse.results[i].highlight.answer[j].split("</em>");
							for (k = 0; k < stringToInspect.length; k++){
								if (stringToInspect[k].includes("<em>")){
									highlightedTerms.push(stringToInspect[k].substring(stringToInspect[k].indexOf("<em>"), stringToInspect[k].length).replace("</em>","").replace("<em>", ""));
								}
							}
						}
					}
					if (queryResponse.results[i].highlight.hasOwnProperty("title")){
						for (j = 0; j < queryResponse.results[i].highlight.title.length; j++){
							stringToInspect = queryResponse.results[i].highlight.title[j].split("</em>");
							for (k = 0; k < stringToInspect.length; k++){
								if (stringToInspect[k].includes("<em>")){
									highlightedTerms.push(stringToInspect[k].substring(stringToInspect[k].indexOf("<em>"), stringToInspect[k].length).replace("</em>","").replace("<em>", ""));
								}
							}
						}
					}
					
					break;
				}
			}
			highlightedTerms = new Set(highlightedTerms);
			let arrayOfHighlightedTerms = Array.from(highlightedTerms);
			specificQueryPackage.push(filteredPassages);
			specificQueryPackage.push(arrayOfHighlightedTerms);
			res1.status(200).send(JSON.stringify(specificQueryPackage, null, 2));
		})
	  .catch(err => {
		console.log('error:', err);
	  });
	  
});

app.post('/generalDiscoveryQuery', (req, res1) => {
	//Unpack payload's body into workable object
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	var discovery = new DiscoveryV1({
	  version: '2019-02-28',
	  iam_apikey: 'VItRjA_lLWhIou2a31mvKTsAtoXZFXvK6q3XuM6t5SzX',
	  url: 'https://gateway.watsonplatform.net/discovery/api'
	});

	var queryParams = {
	  environment_id: 'a81bea55-c449-4499-8c7b-4cd3358ea94d',
	  collection_id: '89949583-2061-48d0-ade2-289ed65a499a',
	  natural_language_query: insertModuleJSON.message,
	  passages:true,
	  passages_count:100
	};

	discovery.query(queryParams)
	  .then(queryResponse => {
		res1.status(200).send(JSON.stringify(queryResponse, null, 2));
		})
	  .catch(err => {
		console.log('error:', err);
	  });
	  
});

app.listen(process.env.PORT || 8080, () => console.log('App is Up'));

