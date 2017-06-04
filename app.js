require('./connectorSetup.js')();
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL)
var intents = new builder.IntentDialog({recognizers: [recognizer]});

intents.matches('pico','/pico');
intents.matches('getdatafromemr','/EMR');


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
        if(session.userData.c.indexOf('John')> -1){session.userData.c = "st john's wort"}
        session.userData.o = session.userData.o.entity;
        
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
      
     var reply = createEvent("changeURL", session.userData.pubmedlink, session.message.address);
        session.endDialog(reply);
    },
]);
//Basic root dialog which takes an inputted color and sends a changeBackground event. No NLP, regex, validation here - just grabs input and sends it back as an event. 
/*bot.dialog('/', [
    function (session) {
        var reply = createEvent("changeBackground", session.message.text, session.message.address);
        session.endDialog(reply);
    }
]);*/

//Creates a backchannel event
const createEvent = (eventName, value, address) => {
    var msg = new builder.Message().address(address);
    msg.data.type = "event";
    msg.data.name = eventName;
    msg.data.value = value;
    return msg;
}