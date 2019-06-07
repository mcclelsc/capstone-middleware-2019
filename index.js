const express = require('express');
const JSONParser = require('body-parser');
const mysql = require('mysql');
const fs = require('fs');
const app = express();

const mysqlConnectionString = "mysql://x9ll9bau5p4f9gt7:dem4enbecbkrvri5@lmag6s0zwmcswp5w.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/t552aveoqrp2w1qh";

const discoveryURL = "https://gateway.watsonplatform.net/discovery/api";
const discoveryAPI = "VItRjA_lLWhIou2a31mvKTsAtoXZFXvK6q3XuM6t5SzX";
const discoveryEnvironmentID = "a81bea55-c449-4499-8c7b-4cd3358ea94d";
const discoveryCollectionID = "89949583-2061-48d0-ade2-289ed65a499a";

const assistantURL = "https://gateway.watsonplatform.net/assistant/api";
const assistantAPI = "jP5yGzV5NNzsfS7NG5xmDg96b9Dj6_t0kug5Kg6nEQUM";
const assistantID = "387f67bb-7fbb-4ca5-a175-88e4dbdc17e5";

const DiscoveryV1 = require('ibm-watson/discovery/v1');

const AssistantV2 = require('ibm-watson/assistant/v2');

const assistant = new AssistantV2({
  version: '2019-02-28',
  iam_apikey: assistantAPI,
  url: assistantURL
});

const discovery = new DiscoveryV1({
	version: '2019-02-28',
	iam_apikey: discoveryAPI,
	url: discoveryURL
});

var sessionId = "";

app.use(JSONParser.urlencoded({limit: '50mb', extended:true}));

app.get('/', (req, res) => {
	/*var connection = mysql.createConnection("mysql://x9ll9bau5p4f9gt7:dem4enbecbkrvri5@lmag6s0zwmcswp5w.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/t552aveoqrp2w1qh");
	connection.connect();
	//connection.query("CREATE DATABASE questionhistory", function(err, result){
	//	if (err){
	//		throw err;
	//	}
	//	console.log("Database Created");
	//});
	
	connection.query("drop table history", function(err, result){
		if (err){
			throw err;
		}
		console.log("Table deleted");
	});
	
	var createString = "create table history(id int primary key auto_increment, question varchar(255), answer text, reportname varchar(255), occurencetime datetime default current_timestamp on update current_timestamp)";
	
	connection.query(createString, function(err, result){
		if (err){
			throw err;
		}
		console.log("Table created");
	});
	
	connection.end();*/
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
		assistant_id: assistantID
	}).then(res => {
		sessionId = res.session_id;
		
		assistant.message({
		assistant_id: assistantID,
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
		assistant_id: assistantID,
		session_id: sessionId,
			input: {
				'message_type': 'text',
				'text': insertModuleJSON.message
			}
		})
		.then(res => {
			chatText = JSON.stringify(res, null, 2);
			chatObject = JSON.parse(chatText);
			
			if (chatObject.output.generic.length > 0){
				chatText = chatObject.output.generic[0].text;
			}
			else{
				chatText = "I could not process your statement. Please try again."
			}
			if (chatObject.output.entities.length > 0 && chatObject.output.intents.length > 0 && chatObject.output.intents[0].intent === "RecognizeReport"){
				chatText = chatObject.output.intents[0].intent + ";uniqueDelimiter;" + chatObject.output.entities[0].value;
			}
			else if (chatObject.output.hasOwnProperty("user_defined")){
				if (chatObject.output.user_defined.chatState === "send"){
					chatText = "sendChatLog";
				}
				else if (chatObject.output.user_defined.chatState === "doNotSend"){
					chatText = "doNotSendChatLog";
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

	var queryParams = {
	  environment_id: discoveryEnvironmentID,
	  collection_id: discoveryCollectionID,
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

	var queryParams = {
	  environment_id: discoveryEnvironmentID,
	  collection_id: discoveryCollectionID,
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
					if (queryResponse.results[i].highlight.hasOwnProperty("answer")){
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

	var queryParams = {
	  environment_id: discoveryEnvironmentID,
	  collection_id: discoveryCollectionID,
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

app.post('/insertQuestion', (req, res1) => {
	var connection = mysql.createConnection(mysqlConnectionString);
	var insertModuleJSON = JSON.parse(Object.keys(req.body)[0]);
	
	var insertString = "insert into history (question, answer, reportname) values ('" + insertModuleJSON.question + "', '" + insertModuleJSON.answer + "', '" + insertModuleJSON.reportname + "')";

	connection.connect();
	connection.query(insertString, function(err, result){
		if (err){
			throw err;
		}
	});
	
	//connection.query("select * from history", function(err, result){
	//	if (err){
	//		throw err;
	//	}
	//	console.log(result);
	//});
	
	connection.end();
	
	res1.status(200).send();
});

app.get('/selectChatHistory', (req, res1) => {
	var connection = mysql.createConnection(mysqlConnectionString);
	connection.connect();
	
	connection.query("select * from history", function(err, result){
		if (err){
			throw err;
		}
		//resultString = result;
		//res1.set('Context-Type', 'text/html')
		res1.send(result);
		console.log(result);
	});
	
	connection.end();
	
});

app.post('/suggestedQuestions', (req, res1) => {
	var jsonData = fs.readFileSync('suggestedQuestions.json');
	var categorizedQuestions = JSON.parse(jsonData);
	
	res1.status(200).send(JSON.stringify(categorizedQuestions, null, 2));
});

/*app.post('/uploadDocument', (req, res1) => {
	
	fs.writeFile('temp.pdf', req.body, 'binary', function(err) {
		if(err)
		  console.log(err);
		else
		  console.log("The file was saved!");
	  });
	
	var documentParams = {
	  environment_id: discoveryEnvironmentID,
	  collection_id: discoveryCollectionID,
	  file: req.body
	};

	discovery.addDocument(documentParams)
	  .then(documentAccepted => {
		res1.status(200).send(JSON.stringify(documentAccepted, null, 2));
		})
	  .catch(err => {
		console.log('error:', err);
	  });
	  
});*/

app.listen(process.env.PORT || 8080, () => console.log('App is Up'));

