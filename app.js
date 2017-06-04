//require('./connectorSetup.js')();
require('dotenv-extended').load();
var sync_request = require("sync-request")
var cheerio = require("cheerio")
var builder = require('botbuilder'),
    fs = require('fs'),
    needle = require('needle'),
    restify = require('restify'),
    request = require('request'),
    url = require('url'),
    speechService = require('./speech-service.js');
var request_promise = require('request-promise').defaults({ encoding: null });
var Promise = require('bluebird');
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

bot = new builder.UniversalBot(connector);

    // Setup Restify Server
    var server = restify.createServer();
    server.listen(process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url);
    });
    server.post('/api/messages', connector.listen());
    bot.use(builder.Middleware.dialogVersion({ version: 0.2, resetCommand: /^reset/i }));

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL)
var intents = new builder.IntentDialog({recognizers: [recognizer]});


intents.matches('pico','/pico');
intents.matches('getdatafromemr','/EMR');
intents.matches('isAlergic','/isAlergic');
intents.matches('caseReport','/case_report')
intents.matches('changeintervention','/change_intervention');
intents.matches('changecontrol','/change_control');
intents.matches('current_medication','/current_medication');
intents.matches('surgery','/surgery');
intents.onDefault('/confused');


//Bot listening for inbound backchannel events - in this case it only listens for events named "buttonClicked"
bot.on("event", function (event) {
    var msg = new builder.Message().address(event.address);
    msg.textLocale("en-us");
    if (event.name === "buttonClicked") {
        msg.text("I see that you just pushed that button");
    }
    bot.send(msg);
})
bot.dialog('/',intents);

bot.dialog('/change_intervention',[
    function(session,args,next){
        session.userData.new_i = builder.EntityRecognizer.findEntity(args.entities,"new_intervention");
        session.userData.i = session.userData.new_i.entity;
        session.userData.search_term = '(('+session.userData.p+') AND ('+session.userData.i+') AND ('+session.userData.c+') AND ('+session.userData.o+'))'
      session.userData.pubmedlink = 'https://www.ncbi.nlm.nih.gov/pubmed?term='+encodeURIComponent(session.userData.search_term);
      //session.send(session.userData.pubmedlink)
     var reply = createEvent("changeURL", session.userData.pubmedlink, session.message.address);
        session.endDialog(reply);

    }
]);

bot.dialog('/change_control',[
    function(session,args,next){
        session.userData.new_c = builder.EntityRecognizer.findEntity(args.entities,"new_control");
        session.userData.c = session.userData.new_c.entity;
        session.userData.search_term = '(('+session.userData.p+') AND ('+session.userData.i+') AND ('+session.userData.c+') AND ('+session.userData.o+'))'
      session.userData.pubmedlink = 'https://www.ncbi.nlm.nih.gov/pubmed?term='+encodeURIComponent(session.userData.search_term);
      //session.send(session.userData.pubmedlink)
     var reply = createEvent("changeURL", session.userData.pubmedlink, session.message.address);
        session.endDialog(reply);

    }
]);

bot.dialog('/isAlergic',[
    function(session,args,next){
        var allergy = builder.EntityRecognizer.findEntity(args.entities,"allergy");
        if(session.userData.patient_allergies== allergy){
            session.endDialog('Yes, the patient is allergic to '+allergy.entity);
        } else {
            session.endDialog('No, the patient is not allergic to '+allergy.entity)
        }
    }
]);
bot.dialog('/current_medication',[
    function(session,args,next){
        //var allergy = builder.EntityRecognizer.findEntity(args.entities,"allergy");
        session.endDialog('The patient is currently on '+session.userData.patient_current_medication);
    }
]);
bot.dialog('/surgery',[
    function(session,args,next){
        //var allergy = builder.EntityRecognizer.findEntity(args.entities,"allergy");
        session.endDialog(session.userData.patient_history_surgery);
    }
]);

bot.dialog('/case_report',[
    function(session,args,next){
        //var allergy = builder.EntityRecognizer.findEntity(args.entities,"allergy");
        session.endDialog(session.userData.patient_present_illness);
    }
]);




bot.dialog('/pico',[
    function(session,args,next){
        entities = args.entities;
        console.log(args)
        //session.userData.query = args.query;
        //session.userData = null
        session.userData.p = builder.EntityRecognizer.findEntity(args.entities,"patients_disorder");
        session.userData.i = builder.EntityRecognizer.findEntity(args.entities,"treatment_intervention");
        session.userData.c = builder.EntityRecognizer.findEntity(args.entities,"treatment_control");
        session.userData.o = builder.EntityRecognizer.findEntity(args.entities,"treatment_outcome");

        session.userData.p = session.userData.p.entity;
        session.userData.i = session.userData.i.entity;
        session.userData.c = session.userData.c.entity;
        if(session.userData.c.indexOf('john')> -1){session.userData.c = "st john's wort"}
        session.userData.o = session.userData.o.entity;

      session.userData.search_term = '(('+session.userData.p+') AND ('+session.userData.i+') AND ('+session.userData.c+') AND ('+session.userData.o+'))'
      session.userData.pubmedlink = 'https://www.ncbi.nlm.nih.gov/pubmed?term='+encodeURIComponent(session.userData.search_term);
      //session.send(session.userData.pubmedlink)
      var reply = createEvent("changeURL", session.userData.pubmedlink, session.message.address);
      session.send(reply);
        
        session.userData.p_alt = find_alt_term(session.userData.p);
        session.userData.i_alt = find_alt_term(session.userData.i);
        session.userData.c_alt = find_alt_term(session.userData.c);
        session.userData.o_alt = find_alt_term(session.userData.o);

        /*session.userData.p_alt = null
        session.userData.i_alt = "Serotonin Uptake Inhibitors"
        session.userData.c_alt = 'Hypericum'
        session.userData.o_alt = null*/
        

        if(session.userData.p_alt && (session.userData.p_alt != session.userData.p)){
            options = ['Include Both','Only include '+session.userData.p,'Only include '+session.userData.p_alt]
            console.log(session.userData.p)
            
            builder.Prompts.choice(session,'Do you want to include '+session.userData.p_alt+' along with '+session.userData.p,options,{listStyle: builder.ListStyle.button});
        }
        else{next({response: 'no alt'})}

    },function(session,results,next){
        if(results.response.entity == 'Include Both'){
            session.userData.p = session.userData.p+' AND '+session.userData.p_alt
        } else if(results.response.entity == 'Only include '+session.userData.p_alt){
            session.userData.p = session.userData.p_alt;
        }
        if(session.userData.i_alt && (session.userData.i_alt != session.userData.i)){
            options = ['Include Both','Only include '+session.userData.i,'Only include '+session.userData.i_alt]
            console.log(session.userData.i)
            
            builder.Prompts.choice(session,'Do you want to include '+session.userData.i_alt+' along with '+session.userData.i,options,{listStyle: builder.ListStyle.button});
        
        }
        else{next({response: 'no alt'})}

    },function(session,results,next){
        if(results.response.entity == 'Include Both'){
            session.userData.i = session.userData.i+' OR '+session.userData.i_alt
        } else if(results.response.entity == 'Only include '+session.userData.i_alt){
            session.userData.i = session.userData.i_alt;
        }
        if(session.userData.c_alt && (session.userData.c_alt != session.userData.c)){
            options = ['Include Both','Only include '+session.userData.c,'Only include '+session.userData.c_alt]
            builder.Prompts.choice(session,'I found an '+session.userData.c_alt+' as an alternative to '+session.userData.c,options,{listStyle: builder.ListStyle.button});
        }
        else{next({response: 'no alt'})}

    },function(session,results,next){
        console.log(results.response)
        if(results.response.entity == 'Include Both'){
            session.userData.c = session.userData.c+' OR '+session.userData.c_alt
        } else if(results.response.entity == 'Only include '+session.userData.c_alt){
            session.userData.c = session.userData.c_alt;
        }
      //session.userData.pubmedlink = https://www.ncbi.nlm.nih.gov/pubmed?term=((depressive%20disorder)%20AND%20ssri)%20AND%20(hypericum%20OR%20st%20john%27s%20wort)&cmd=correctspelling;
      session.userData.search_term = '(('+session.userData.p+') AND ('+session.userData.i+') AND ('+session.userData.c+') AND ('+session.userData.o+'))'
      session.userData.pubmedlink = 'https://www.ncbi.nlm.nih.gov/pubmed?term='+encodeURIComponent(session.userData.search_term);
      //session.send(session.userData.pubmedlink)
     var reply = createEvent("changeURL", session.userData.pubmedlink, session.message.address);
        session.endDialog(reply);
    },
]);bot.dialog('/emr',[
    function(session,args,next){
        builder.Prompts.attachment(session,'Please upload the EMR');
    },
    function(session,results,next){
        var msg = session.message;
        var attachment = msg.attachments[0];
        console.log('---------------------------Image received---------------------------')
        if (attachment) {

            // Message with attachment, proceed to download it.
            // Skype & MS Teams attachment URLs are secured by a JwtToken, so we need to pass the token from our bot.
            console.log(attachment);

            var fileDownload = new Promise(
                function(resolve, reject) {
                    var check = checkRequiresToken(msg);
                    if  (check==true) {
                        resolve(requestWithToken(attachment.contentUrl));
                    } else {
                        resolve(request_promise(attachment.contentUrl));
                    }
                }
            );

            fileDownload.then(
                function (response) {

                readImageText(response, attachment.contentType, function (error, response, body) {
                    session.userData.EMRText = (extractText(body));
                    session.send(session.userData.EMRText)
                    LUIS_link = process.env.LUIS_MODEL_URL
                    var url = LUIS_link + encodeURIComponent(session.userData.EMRText)
                    var res = sync_request('GET', url);
                    var EMRjson = JSON.parse(res.getBody('utf8'))
                    console.log(EMR)
                    
                   
                    
                });

                }).catch(function (err, reply) {
                    console.log('Error with attachment: ', { 
                        statusCode: err.statusCode, 
                        message: err });
                        session.send("Error with attachment or reading image with %s", err);
            });
        } 
    },
   
    //}
]);

bot.dialog('/EMR',[
    function(session,args,next){
        builder.Prompts.attachment(session,'Please upload the EMR');
    },
    function(session,results,next){
        var msg = session.message;
        var attachment = msg.attachments[0];
        session.userData.patient_name = 'Chandler Bing';
        session.userData.patient_age = '48';
        session.userData.patient_sex = 'Male';
        session.userData.patient_present_illness = '30 Year old male patient is diagnosed with depression. He would prefer to alternative medicines rather than SSRI. He was complaining of blurred vision for the past 1 month. He finds it so difficult for him to read clearly and is even affecting his driving. He also notes that he has to be getting up to the bathroom frequently, esp. at night. He now routinely gets up to urinate 3-4 times a night. He is not aware of any particular weight loss, but does feel thirsty much of the time.';
        session.userData.patient_history_illness = 'Hypertension';
        session.userData.patient_history_surgery = 'No surgery till date';
        session.userData.patient_allergies = 'crocin';
        session.userData.patient_current_medication = '	METOPROLOL 25MG XL TAB Qty: 90 for 90 ACTIVE days Sig: TAKE ONE TABLET MOUTH QDAY Refills: 0 FOR THE HEART';
        session.userData.patient_history_family = 'Diabetes: Father, Sibling, Grandparent';
        session.endDialog('Patient data obtained')
    }]);

    bot.dialog('/confused',[
    function (session,args,next){
        session.sendTyping();
        session.send('Pardon me. I did\'t understand that. Please try again');
        session.endDialog();
    }
]);


 //'''''''''''''''''''''''''''''''''''''''''//
 //        helper functions                //
//'''''''''''''''''''''''''''''''''''''''//

function find_alt_term(searchterm) {
    console.log(searchterm)
    var url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=" + encodeURIComponent(searchterm) +"&format=json";
    
    
    var res = sync_request('GET', url);
    var json = JSON.parse(res.getBody('utf8'))
   // console.log(json)
    
    var esearchresult = json["esearchresult"]
    var translationstack = esearchresult["translationstack"]
    for(i=0;i<translationstack.length;i++) {
        if(translationstack[i]["field"] == "MeSH Terms") {
            term = translationstack[i]["term"]
            var splitted_terms = term.split("\"")
            splitted_terms = splitted_terms.filter(function(entry) { return entry.trim() != ''; });
            return(splitted_terms[0])
        }
    }
};
// Helper methods

// Request file with Authentication Header
var requestWithToken = function (url) {
    return obtainToken().then(function (token) {
        return request_promise({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

var checkRequiresToken = function (message) {
    return message.source === 'skype' || message.source === 'msteams';
};
//=========================================================
// Vision Service
//=========================================================

// A request with binary image data to OCR API
var readImageText = function _readImageText(url, content_type, callback) {

    var options = {
        method: 'POST',
        url: 'https://eastus2.api.cognitive.microsoft.com/vision/v1.0/ocr?language=unk&detectOrientation =true HTTP/1.1',
        headers: {
            'Ocp-Apim-Subscription-Key': '03da9800160e4929a3eb34358b82ec57',
            'Content-Type': 'application/octet-stream'
        },
        body: url,
        json: false
    };
    request(options, callback);

};

var readImageTextUrl = function _readImageTextUrl(url, content_type, callback) {

    var options = {
        method: 'POST',
        url: config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_URL + "ocr/",
        headers: {
            'ocp-apim-subscription-key': config.CONFIGURATIONS.COMPUTER_VISION_SERVICE.API_KEY,
            'content-type': content_type
        },
        body: {url: url, language: "en"},
        json: true
    };

    request(options, callback);

};
var extractText = function _extractText(bodyMessage) {

    var bodyJson = bodyMessage;

    // The attached images are json strings, the urls are not
    //  so only convert if we need to
    if (IsJsonString(bodyMessage)) {
        bodyJson = JSON.parse(bodyMessage);
    }

    // The "regions" - part of the json to drill down first level
    var regs = bodyJson.regions;
    text = "";

    if (typeof regs === "undefined") {return "Something's amiss, please try again.";};

    // Get line arrays
    var allLines = regs.map(x => x.lines);
    // Flatten array
    var allLinesFlat =  [].concat.apply([], allLines);
    // Get the words objects
    var allWords = allLinesFlat.map(x => x.words);
    // Flatten array
    var allWordsFlat = [].concat.apply([], allWords);
    // Get the text
    var allText = allWordsFlat.map(x => x.text);
    // Flatten
    var allTextFlat = [].concat.apply([], allText);

    text = allTextFlat.join(" ");

    if (text) {
        return text;
    } else {
        return "Could not find text in this image. :( Try again?";
    }
};

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
//Creates a backchannel event
const createEvent = (eventName, value, address) => {
    var msg = new builder.Message().address(address);
    msg.data.type = "event";
    msg.data.name = eventName;
    msg.data.value = value;
    return msg;
}