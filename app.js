var request = require('superagent');
var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var parseString = require('xml2js').parseString;

var Reportback = mongoose.model('Reportback', new Schema({
  time: String,
  phone: String,
  oip: String,
  campaign: String,
  url: String
}), 'recovery');

const RECOVERY_START_TIME = '2016-03-01T00:00:00-05:00';
const RECOVERY_END_TIME = '2016-07-28T17:00:00-05:00';

function mobileCommonsGet(url, query, cb) {
  request
   .get(`https://secure.mcommons.com/api/${url}`)
   .auth(process.env.EMAIL, process.env.PASSWORD)
   .query(query)
   .buffer()
   .accept('xml')
   .type('xml')
   .end(function(err, res) {
     if (err) {
       console.log(err);
       return;
     }

     parseString(res.text, function (err, result) {
       if (err) {
         console.log(err);
         return;
       }

       cb(result);
     });
   });
}

function downloadImage(url, name, cb) {
  // Download the image to file system
  var stream = fs.createWriteStream(`img/${name}.jpg`);
  var req = request.get(url);
  req.pipe(stream).on('close', cb);
}

function parseMessage(index, messages, cb) {
  const message = messages[index];
  if (message == undefined) {
    cb();
    return;
  }

  // console.log(JSON.stringify(message));

  addReportback(message, function onWrite(id) {
    downloadImage(message.mms[0].image_url[0], `rb-${id}`, function done() {
      parseMessage(index + 1, messages, cb);
    });
  });
}

function addReportback(message, cb) {
  var oip = message.keyword[0].opt_in_path_id;
  var rb = new Reportback({
    time: message.received_at,
    phone: message.phone_number,
    oip: oip,
    campaign: getCampaignIdForOptInPath(oip),
    url: message.mms[0].image_url
  });

  rb.save(function(err) {
    if (err) {
      console.log(err);
      return;
    }

    cb(rb.id);
  })
}

function getCampaignIdForOptInPath(optInPath) {
  var campaignId;
  switch (parseInt(optInPath)) {
    // Notes For Shawn
    case 209633:
      campaignId = 2805;
      break;
  }
  return campaignId;
}

function getMessages(page) {
  console.log(`Getting page ${page}`);
  const query = {
    start_time: RECOVERY_START_TIME,
    end_time: RECOVERY_END_TIME,
    page: page,
    mms: true
  };

  mobileCommonsGet('messages', query, function(data) {
    const messages = data.response.messages[0];
    const meta = messages['$'];

    parseMessage(0, messages['message'], function done() {
      if (page == meta.page_count) {
        console.log("Its finished!");
      }
      else {
        // uncomment when we wanna go live....
        // getMessages(page++);
      }
    });
  });
}

mongoose.connect('mongodb://localhost/');
getMessages(1);
