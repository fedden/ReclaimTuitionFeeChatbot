/*
 * Starter Project for Messenger Platform Quick Start Tutorial
 *
 * Remix this as the starting point for following the Messenger Platform
 * quick start tutorial.
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 */



var states = Object.freeze({
  greeting: 0,
  ask_name: 1,
  confirm_name: 2,
  confirm_goldsmiths_student: 3,
  warning_non_goldsmiths_student: 4,
  confirm_student_id: 5,
  ask_how_many_days: 6,
  ask_how_much_cost: 7,
  create_signiture: 8,
  ask_data_format: 9,
  send: 10,
  ask_first_name: 11,
  ask_last_name: 12,
  ask_email: 13
});

const repeatText = "Sorry I didn't understand your reply :( I'll repeat my last message to you!";

String.prototype.levenstein = function(string) {
    var a = this, b = string + "", m = [], i, j, min = Math.min;

    if (!(a && b)) return (b || a).length;

    for (i = 0; i <= b.length; m[i] = [i++]);
    for (j = 0; j <= a.length; m[0][j] = j++);

    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            m[i][j] = b.charAt(i - 1) == a.charAt(j - 1)
                ? m[i - 1][j - 1]
                : m[i][j] = min(
                    m[i - 1][j - 1] + 1, 
                    min(m[i][j - 1] + 1, m[i - 1 ][j] + 1))
        }
    }

    return m[b.length][a.length];
}

const verbose = false;
const sigFolder = 'public';
const publicURL = 'https://grateful-duckling.glitch.me';

'use strict';

// Imports dependencies and set up http server

const 
  request = require('request'),
  express = require('express'),
  goldsmiths = require('./goldsmiths'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json()); // creates express http server
const fs = require('fs');
var sh = require('shelljs');
var nodemailer = require('nodemailer');
var validator = require("email-validator");

var transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_PASSWORD
    }
});

var users;
try {
  readUsers();
} catch (e) {
  users = {};
}

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.use(express.static('public'));

// Define the URLs we'll allow.
var ALLOWED_BY = new Set([
  'https://www.messenger.com/',
  'https://www.facebook.com/'
])

app.get('/iframe', function (req, res) {
  // Is the URL in the whitelist?
  // Set X-Frame-Options if so. Otherwise, we won't
  // set the header and browsers will block it.
  var domain = String(req.query.domain)
  if (ALLOWED_BY.has(domain)) {
    res.setHeader('X-Frame-Options', 'ALLOW-FROM ' + domain)
  }

  // Send the iframe as usual.
  res.sendFile('iframe.html')
})

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Get the webhook event. entry.messaging is an array, but 
      // will only ever contain one event, so we get index 0
      let webhook_event = entry.messaging[0];
      
      if (verbose) console.log(webhook_event);
      
      // Get the sender PSID
      let sender_psid = webhook_event.sender.id.toString();
      if (verbose) console.log('Sender PSID: ' + sender_psid);
      // Check if the event is a message or a postback
      // Pass the event to the appropraite handler function.
      
      
      const message = webhook_event.message;
      
      const invalidStates = [
        states.confirm_student_id,
        states.ask_how_many_days,
        states.ask_how_much_cost,
        states.ask_first_name,
        states.ask_last_name,
        states.ask_email
      ];
      
      let validState = true;
      if (users[sender_psid] != undefined) {
        for (var i = 0; i < invalidStates.length; ++i) {
          if (users[sender_psid].state == invalidStates[i]) {
            validState = false;
            i = invalidStates.length;
            break;
          }
        } 
      }
      
      if (message) {
        
        try {
          if (validState && (
              message.text.toLowerCase().levenstein('start again') < 2 ||
              message.text.toLowerCase().levenstein('start') < 2 ||
              message.text.toLowerCase().levenstein('hello') < 2 ||
              message.text.toLowerCase().levenstein('hi') < 2 ||
              message.text.toLowerCase().levenstein('hello there') < 2 ||
              message.text.toLowerCase().levenstein('hi there') < 2 ||
              message.text.toLowerCase().levenstein('begin') < 2)) {

            // Set the response based on the postback payload
            users[sender_psid] = {};
            getFirstMessage(sender_psid).then(t => {

              const response = getYesNoQuickQuestion(t);

              callSendAPI(sender_psid, response);
            });

          } else {

            handleMessage(sender_psid, message);
          }
        
        } catch (error) {
          
          console.log(error);
        }
        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  
  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = "superdude";
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});


// Handle POST from xxx/receive
app.post('/receive', function(request, respond) {
  
  let body = '';
  
  request.on('data', function(data) {
    body += data;
  });
  
  request.on('end', function (){
    
    body = JSON.parse(body);
    
    let psid = body.name;
    
    if (psid.length > 25) {

      let stop;
      for (var i = 0; i < psid.length; ++i) {

        stop = i;
        if (isNaN(parseInt(psid[i], 10))) {
          break;
        }
      }

      psid = psid.substring(0, stop);
    }
    
    const filePath = __dirname + '/' + sigFolder + '/' + `${psid}.png`;
    
    notifyUserRecivedSignature(psid);
    
    // Get rid of the image header as we only need the data parts after it.
    const data = body.data.replace(/^data:image\/\w+;base64,/, "");
    // Create a buffer and set its encoding to base64
    var buf = new Buffer(data, 'base64');
    // Write
    fs.writeFile(filePath, buf, function(err){
      if (err) throw err
      // Respond to client that the canvas image is saved.
      
      users[psid].signature_exists = true;
      respond.end();
    });
  });
});

function notifyUserRecivedSignature(psid) {

  users[psid].state = states.ask_data_format;
  const response = {
    
    text: 'Great, we got your signature! For now I will only support rendering your letter as a PDF - but more features are coming soon! Please select PDF below to continue :)',
      
    quick_replies: [
      {
        content_type: "text",
        title: "PDF",
        payload: "LATEX_PAYLOAD"
      }
    ],
    
  };
  
  callSendAPI(psid, response);
}










function handleTextMessage(sender_psid, received_message) {
  
  let userState = users[sender_psid].state;
  let text;
  let quickReplies = null;
  
  if (userState == states.ask_name) {

    text = "Thanks " + received_message;
    
  } else if (userState == states.ask_first_name) {
    
    text = "Thanks " + received_message + ". Now what is your second name?";
    users[sender_psid].first_name = received_message;
    users[sender_psid].state = states.ask_last_name;
    
  } else if (userState == states.ask_last_name) {
    
    text = "Awesome! Now are you a goldsmiths student?";
    users[sender_psid].last_name = received_message;
    
    quickReplies = [
      {
        content_type: "text",
        title: "Yes",
        payload: "YES_PAYLOAD"
      },
      {
        content_type: "text",
        title: "No",
        payload: "NO_PAYLOAD"
      }
    ]
    users[sender_psid].state = states.confirm_goldsmiths_student;

  } else if (userState == states.confirm_student_id) {
    
    users[sender_psid].student_id = received_message;
    
    users[sender_psid].state = states.ask_email;
    
    text = `Thanks. Next I need to know your email address, prefereably your student one so there is an easy contact method in the correspodance I generate for you. To be clear, I will not store, share or ever send you anything via this email address.\n\nPlease write your email adress down next.`;
    
  } else if (userState == states.ask_how_much_cost) {
    
    users[sender_psid].tuition_fee = Number(received_message);
    
    if (!isNaN(users[sender_psid].tuition_fee)) {
      
      const days = users[sender_psid].amount_days;

      const cost = moneyOwed(users[sender_psid].tuition_fee, days);
      users[sender_psid].amount_reimburse = cost;

      text = `Thanks again! Nearly done now :)\n\n` +
             `I calculate that 14 out of your ${days} days at your tuition cost means you should be reinbursed £${cost}.\n\n` + 
             `Would you like to add your signature to the correspondance? ` +
             `(A pop-up will appear)`;
      quickReplies = [ 
        {
          content_type: "text",
          title: "Sounds cool!",
          payload: "YES_PAYLOAD"
        },
        {
          content_type: "text",
          title: "No Thanks",
          payload: "NO_PAYLOAD"
        }
      ];

      users[sender_psid].state = states.create_signiture;
    }

  } else if (userState == states.ask_how_many_days) {
    
    users[sender_psid].amount_days = Number(received_message);
    
    if (!isNaN(users[sender_psid].amount_days)) {
      
      users[sender_psid].state = states.ask_how_much_cost;

      text = "Great thanks for that.\n\n" +
             "Next, how much is the tution fees for this academic year?\n\n" + 
             "Select either a custom amount (in GBP £) or the default, £9000.";
      quickReplies = [
        {
          content_type: "text",
          title: "Default £9000",
          payload: "DEFAULT_PAYLOAD"
        },
        {
          content_type: "text",
          title: "Custom",
          payload: "CUSTOM_PAYLOAD"
        }
      ];
    }
  } else if (userState == states.ask_email) {
    
    users[sender_psid].email_address = received_message;
    
    if (validator.validate(users[sender_psid].email_address)) {
      
      users[sender_psid].state = states.ask_how_many_days;

      text = `We will now need to work out how much you are owed.\n\n` +
             `For now, we will work out the ` +
             `fraction of tution fee that you have spent not accessing the ` +
             `universities facilities during the 14 day strike. Firstly, we ` +
             `need to know how many days there are in your academic year. On ` +
             `average (and this is a conservative estimate) there are 170.\n\n` +
             `Would you like to use the default 170 days or would you like to ` +
             `enter a custom amount?`;

      quickReplies = [
        {
          content_type: "text",
          title: "Default",
          payload: "DEFAULT_PAYLOAD"
        },
        {
          content_type: "text",
          title: "Custom",
          payload: "CUSTOM_PAYLOAD"
        }
      ];
    }
  }
  
  let response = { text: text };
  
  if (quickReplies != null) {
    response.quick_replies = quickReplies;
  }
  
  return response;
}


function handleQuickReply(sender_psid, received_reply) {
  
  let payload = received_reply.payload;
  let response;
  
  if (payload === 'YES_PAYLOAD') {
       
    if (users[sender_psid].state == states.confirm_name) {
      
      response = getYesNoQuickQuestion("Great, thanks! Now, are you a Goldsmiths student?");
      
      users[sender_psid].state = states.confirm_goldsmiths_student;

    } else if (users[sender_psid].state == states.confirm_goldsmiths_student) {
      
      response = {
        "text": "Okay great, thanks! Can you next tell me what your student ID number is?"
      }
      
      users[sender_psid].university = "goldsmiths";      
      users[sender_psid].state = states.confirm_student_id;
      
    } else if (users[sender_psid].state == states.create_signiture) {
      
      response = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: "Draw your signiture!",
            buttons: [
              {
                type: "web_url",
                url: `https://grateful-duckling.glitch.me?${sender_psid}`,
                title: "Start here",
                webview_height_ratio: "tall",
                messenger_extensions: "true",  
              }
            ]
          }
        }
      };
    }
    
  } else if (payload === 'NO_PAYLOAD') {
    
    if (users[sender_psid].state == states.confirm_name) {
      
      response = {
        text: "Okay no problem! Please tell me your first name."
      }
      
      users[sender_psid].state = states.ask_first_name;
    
    } else if (users[sender_psid].state == states.confirm_goldsmiths_student) {
      
      response = {
        text: "Okay no problem! Just be aware that this chatbot and the functionality is in an alpha stage with Goldsmiths students in mind, so there may be a few elements that are not currently available to you. If you have feature requests please leave messages on my facebook page! :)\n\nOkay next question - what is your student ID number?"
      }

      users[sender_psid].university = "other";
      users[sender_psid].state = states.confirm_student_id;
    
    } else if (users[sender_psid].state == states.create_signiture) {
      
      users[sender_psid].signature_exists = false;
      users[sender_psid].state = states.ask_data_format;
      response = {

        text: 'No problem! For now I will only support rendering your letter as a PDF - but more features are coming soon! Please select PDF below to continue :)',

        quick_replies: [
          {
            content_type: "text",
            title: "PDF",
            payload: "LATEX_PAYLOAD"
          }
        ],
    
      };
      
    }
    
  } else if (payload === 'CUSTOM_PAYLOAD') {
    
    if (users[sender_psid].state == states.ask_how_many_days) {
      response = {
        text: "Please write in numbers how many days you have in your academic year."
      }
    
    } else if (users[sender_psid].state == states.ask_how_much_cost) {
      response = {
        text: "Please write in numbers how much in british pound sterling £ your annual tuition fee is."
      }
    
    }
    
  } else if (payload === 'DEFAULT_PAYLOAD') {
    
    if (users[sender_psid].state == states.ask_how_many_days) {
      
      users[sender_psid].amount_days = 170;
      
      let text = "Great thanks for that.\n\n" +
                 "Next, how much is the tution fees for this academic year?\n\n" + 
                 "Select either a custom amount (in GBP £) or the default, £9000.";
      let replies = [
        {
          content_type: "text",
          title: "Default £9000",
          payload: "DEFAULT_PAYLOAD"
        },
        {
          content_type: "text",
          title: "Custom",
          payload: "CUSTOM_PAYLOAD"
        }
      ];
      response = getQuickQuestion(text, replies);
      users[sender_psid].state = states.ask_how_much_cost;
      
    } else if (users[sender_psid].state == states.ask_how_much_cost) {
    
      const tuitionFee = 9000;
      users[sender_psid].tuition_fee = tuitionFee;
      const days = users[sender_psid].amount_days;

      const cost = moneyOwed(tuitionFee, days);
      users[sender_psid].amount_reimburse = cost;
      // I calculate that 14 out of your ${days} days at your tuition cost means you should be 
      let text = `Thanks again! Nearly done now :)\n\n` +
                 `I calculate that 14 out of your ${days} days at your tuition cost means you should be reinbursed £${cost}.\n\n` + 
                 `Signatures can help improve the authenticity of documents. Would you like to add your signature to the generated correspondance? `;
      let replies = [ 
        {
          content_type: "text",
          title: "Yes",
          payload: "YES_PAYLOAD"
        },
        {
          content_type: "text",
          title: "No",
          payload: "NO_PAYLOAD"
        }
      ];
      response = getQuickQuestion(text, replies);
      users[sender_psid].state = states.create_signiture;
    
    } 
  } else if (payload === 'LATEX_PAYLOAD') {
  
    const isGoldsmiths = users[sender_psid].university == "goldsmiths";
    
    // Create the latex file from template and user data.
    const latexString = goldsmiths.generateLatexFile(sender_psid, 
                                                     users[sender_psid].first_name, 
                                                     users[sender_psid].last_name, 
                                                     users[sender_psid].email_address, 
                                                     users[sender_psid].student_id, 
                                                     users[sender_psid].tuition_fee, 
                                                     users[sender_psid].amount_days, 
                                                     users[sender_psid].amount_reimburse,
                                                     users[sender_psid].signature_exists,
                                                     isGoldsmiths);

    fs.writeFile(`./public/${sender_psid}.tex`, latexString, function(err) {
      if (err) {
        return console.log(err);
      }
      
      let shell;
      if (users[sender_psid].signature_exists) {
        shell = `./laton public/${sender_psid}.tex public/${sender_psid}.png && mv ${sender_psid}.pdf public/`;
      } else {
        shell = `./laton public/${sender_psid}.tex && mv ${sender_psid}.pdf public/`
      }
      
      // Use laton and wait for pdf to exist.
      const { stdout, stderr, code } = sh.exec(shell, { silent: true });
      
      const mailOptions = {
        from: process.env.GMAIL_ADDRESS, // sender address
        to: users[sender_psid].email_address, // list of receivers
        subject: 'Your tuition fee reclaimation letter', // Subject line
        html: '<p>Hi! Please find attached your tuition fee letter. Make sure you send it to the right people!</p>',// plain text body
        attachments: [{
          filename: "letter.pdf",
          path: `public/${sender_psid}.pdf`
        }]
      };
      // Send as attachment.
      // Send the HTTP request to the Messenger Platform
      transporter.sendMail(mailOptions, function (err, info) {
        if (verbose)
          console.log(info);
        
        // Clean up
        fs.unlink(`./public/${sender_psid}.pdf`, (err) => {
          if (verbose)
            console.log(`./public/${sender_psid}.pdf was deleted`);
        });
        fs.unlink(`./public/${sender_psid}.tex`, (err) => {
          if (verbose)
            console.log(`./public/${sender_psid}.tex was deleted`);
        });
        if (users[sender_psid].signature_exists) {
          fs.unlink(`./public/${sender_psid}.png`, (err) => {
            if (verbose)
              console.log(`./public/${sender_psid}.png was deleted`);
          });
        }
      });

    }); 
    
    response = {
        "text": "Awesome! I'm just generating your document and a link will be sent to the email adress you supplied earlier! If you would like to use my service again, please select 'start again' from the menu below :)"
    }
  }
  return response;
}

function moneyOwed(tuition_cost, amount_days) {
  
  const fractionDays = 14 / amount_days;
  const fractionCost = fractionDays * tuition_cost;
  return Math.floor(fractionCost);
}

// Handles messages events
function handleMessage(sender_psid, received_message) {
  
  let response;

  // Check if the message is a quick reply.
  if (received_message.quick_reply) {
    
    response = handleQuickReply(sender_psid, received_message.quick_reply);
    
  } else  if (received_message.text) {      
    
    response = handleTextMessage(sender_psid, received_message.text);   
  }
  
  let isSig = true;
  
  try {
    if (response.attachment.payload.text != 'Draw your signiture!') {
      isSig = false;
    }
  } catch (e) {
    isSig = false;
  }

  if (response.text == undefined && !isSig)
    repeatLastmessage(sender_psid);
  
  else
    // Sends the response message
    callSendAPI(sender_psid, response);  
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'Greeting' || payload == 'START_AGAIN_PAYLOAD') {
    
    users[sender_psid] = {};
    getFirstMessage(sender_psid).then(t => {
      
      response = getYesNoQuickQuestion(t);
      
      callSendAPI(sender_psid, response);
    });

  } else if (payload === 'CONTACT_PAYLOAD') {
    
    const message = users[sender_psid].last_message;
    
    // Construct the message body
    let request_body = {
      recipient: {
        id: sender_psid
      },
      message: { text: contact() }
    }

    // Send the HTTP request to the Messenger Platform
    request({
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    }, (err, res, body) => {
      if (!err) {
        if (verbose) console.log('message sent!')
        
        callSendAPI(sender_psid, message.response, message.file_data);
        
      } else {
        console.error("Unable to send message:" + err);
      }
    });
  } 
}

function writeUsers() {
  var string = JSON.stringify(users, null, 2);
  fs.writeFile('db.json', string, 'utf8', (err) => {
    if (err) console.log(err);
  });
}

function readUsers() {
  fs.readFile('db.json', 'utf8', (err, fileContent) => {
    if (err) {
      console.log(err);
    } else {
      users = JSON.parse(fileContent.toString());
      if (verbose)
        console.log(users);
    }
  });
}


// Sends response messages via the Send API
function callSendAPI(sender_psid, response, file_data=null) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  }
  
  if (file_data != null) {
    request_body.filedata = file_data;
  }

  // Send the HTTP request to the Messenger Platform
  request({
    uri: "https://graph.facebook.com/v2.6/me/messages",
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: "POST",
    json: request_body
  }, (err, res, body) => {
    if (!err) {
      if (verbose) console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
  
  // save last message
  if (response.text != repeatText) {
    users[sender_psid].last_message = {
      sender_psid: sender_psid,
      response: response,
      file_data: file_data
    };
  }
  
  writeUsers();
}

function repeatLastmessage(sender_psid) {
  
  if (sender_psid == undefined || 
      users[sender_psid] != undefined) {
    
    const message = users[sender_psid].last_message;
    
    // Construct the message body
    let request_body = {
      recipient: {
        id: sender_psid
      },
      message: { text: repeatText }
    }

    // Send the HTTP request to the Messenger Platform
    request({
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    }, (err, res, body) => {
      if (!err) {
        if (verbose) console.log('message sent!')
        
        callSendAPI(sender_psid, message.response, message.file_data);
        
      } else {
        console.error("Unable to send message:" + err);
      }
    });


  } else {
    users[sender_psid] = {};
    getFirstMessage(sender_psid).then(t => {
      const response = getYesNoQuickQuestion(t);
      callSendAPI(sender_psid, response);
    });
  }
}

function getYesNoQuickQuestion(question) {
  
  const replies = [
    {
      content_type: "text",
      title: "Yes",
      payload: "YES_PAYLOAD"
    },
    {
      content_type: "text",
      title: "No",
      payload: "NO_PAYLOAD"
    }
  ];
  return getQuickQuestion(question, replies);
}
  

function getQuickQuestion(question, replies) {
  return { text: question, quick_replies: replies };
}


function contact() {
  let body = 'Thanks for wanting to get in touch! You can email me at leonfedden@gmail.com\n\nI will now repeat my last message :)';
  return body;
}


async function getFirstMessage(psid) {
  let text = 'Hey! Great to hear from you.\n\nI am going to ask you a few questions and then email a letter to you that can be used to help recover some of your tuition fees.';
  var body = await firstMessage(psid);
  let object = JSON.parse(body);
  let firstName = object["first_name"];
  let lastName = object["last_name"];
  
  if (firstName == undefined || lastName == undefined) {
    
    users[psid].state = states.ask_name;
    text += '\n\nFor some reason I can not access your name. What is your full name?';
  } else {
    
    users[psid].state = states.confirm_name;
    text += "\n\nI have your name as ";
    text += (firstName + " " + lastName);
    text += ", is that right?";
    users[psid].first_name = firstName;
    users[psid].last_name = lastName;
  }
  return text;
}

function firstMessage(psid) {

  let uri = `https://graph.facebook.com/v2.6/${psid}`
  return new Promise(function(resolve) {

    request({
      uri: uri,
      qs: { 
        access_token: PAGE_ACCESS_TOKEN,
        fields: "first_name,last_name"
      },
      method: "GET"
    }, (error, res, body) => {
      if (!error) {
        
        resolve(body);

      } else {
        console.error("Unable to send message:" + error);
        resolve(undefined);
      }
    });
  });
}
