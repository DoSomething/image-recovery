var request = require('superagent');
var parseString = require('xml2js').parseString;

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

function parseMessage(index, messages, cb) {
  const message = messages[index];
  if (message == undefined) {
    cb();
    return;
  }

  console.log(JSON.stringify(message));
  // Temporary to prevent max stack exceed, once the actual async functions are in this timeout can go
  setTimeout(function() {
    parseMessage(index++, messages, cb);
  }, 100);
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
