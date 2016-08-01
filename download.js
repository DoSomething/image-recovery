var request = require('superagent');
var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var parseString = require('xml2js').parseString;
var timeUtils = require(__dirname + '/time_utils');
var smsConfig = require(__dirname + '/sms_config');

var Reportback = mongoose.model('Reportback', new Schema({
  time: String,
  phone: String,
  oip: String,
  campaign: String,
  url: String,
  nid: String
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

function getCampaignIdForOptOutPath(optOutPath) {
  var config = smsConfig.find(function(conf) {
    return conf.campaign_optout_id == optOutPath;
  });

  if (!config) {
    return `unknown-${optOutPath}`;
  }

  return config.campaign_nid;
}

function addReportback(message, cb) {
  var optOutPath = message.campaign == undefined ? 'no' : message.campaign[0]['$'].id;
  var rb = new Reportback({
    time: message.received_at,
    phone: message.phone_number,
    oip: message.keyword[0].opt_in_path_id,
    campaign: getCampaignIdForOptOutPath(optOutPath),
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

function parseMessage(index, messages, cb) {
  const message = messages[index];
  if (message == undefined) {
    cb();
    return;
  }

  addReportback(message, function onWrite(id) {
    downloadImage(message.mms[0].image_url[0], `rb-${id}`, function done() {
      parseMessage(index + 1, messages, cb);
    });
  });
}

function getMessages(page) {
  if (page == -1) {
    return.
  }

  console.log(`Getting page ${page}`);
  var start = timeUtils.clock();

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
      var time = timeUtils.clock(start);
      timeUtils.addRunTime(time);
      console.log(`Page ${page} took ${time}ms -- Approx. ${Math.round(((meta.page_count - page) * timeUtils.average) / 1000)} seconds left (or ${Math.round(((meta.page_count - page) * timeUtils.average) / 1000 / 60)} minutes)`);

      if (page == meta.page_count) {
        console.log("Its finished!");
      }
      else {
        // uncomment when we wanna go live....
        getMessages(page + 1);
      }
    });
  });
}

mongoose.connect('mongodb://localhost/');
//getMessages(-1);
