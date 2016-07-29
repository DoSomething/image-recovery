var request = require('superagent');
var parseString = require('xml2js').parseString;

const RECOVERY_START_TIME = '2016-06-01T00:00:00-05:00';
const RECOVERY_END_TIME = '2016-06-28T17:00:00-05:00';


var idNotesForShawn = 209633;

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

function parseMessage(index, messages, cb) {
  const message = messages[index];
  if (message == undefined) {
    cb();
    return;
  }
//  console.log(JSON.stringify(message.campaign))
  addReportback(message);   
  // Temporary to prevent max stack exceed, once the actual async functions are in this timeout can go
  setTimeout(function() {
    parseMessage(index++, messages, cb);
  }, 100);
}

function addReportback(message) {
  var mocoIdString = message.campaign[0]['$'].id;
  console.log('campaignId ' + campaignId);
  return;
  var oip = message.keyword[0].opt_in_path_id;
  var optInPath = parseInt(oip);
  if (optInPath == idNotesForShawn) {
    console.log("Skip notes");
    return;
  }
  var mocoId = parseInt(message.campaign[0]['$'].id);
  console.log('time' + message.received_at);
  console.log('phone ' + message.phone_number);
  console.log('oip ' + oip);
  console.log('campaign ' + getCampaignIdForOptInPath(optInPath))
  console.log('url ' + message.mms[0].image_url);
  return;
}

function getDSCampaignIdForMoCoCampaignId(mocoId) {
  var campaignId;
  switch (mocoId) {
    case (145007):
      campaignId = 3590;
      break;
  }
  return campaignId;
}

/**
 *
 * optInPath should belong to the MoCo Campaign-campaign's Reportback Start Keyword.
 * e.g. NotesForShawn (node/2805): https://secure.mcommons.com/campaigns/146281/opt_in_paths/209633
 *
 */
function getCampaignIdForOptInPath(optInPath) {
  var campaignId;

  switch (optInPath) {

    // case "loveletters2016"
    //   campaignId = 3755;
    //   break;
// nyleweareable2016
    // NotesForShawn2016
    case 209633:
      campaignId = 2805;
      break;

    // powertotheperiod2016
    case 209205:
      campaignId = 6922;
      break;

    // PrideOverPrejudice2016
    case 209531:
      campaignId = 48;
      break;

    // smilesforsoldiers2016
    case 209083:
      campaignId = 2933;
      break;
  }

  return campaignId;
}

function getMessages(page) {
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

getMessages(1);
