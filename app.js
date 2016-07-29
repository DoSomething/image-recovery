var request = require('superagent');
var fs = require('fs');
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

function downloadImage(url, name, cb) {
  // Download the image to file system
  var stream = fs.createWriteStream(`img/${name}.jpg`);
  var req = request.get(url);
  req.pipe(stream).on('close', cb);
}

function parseMessage(index, messages, cb) {
  console.log(index);
  const message = messages[index];
  if (message == undefined) {
    cb();
    return;
  }

  console.log(JSON.stringify(message));

  downloadImage(message.mms[0].image_url[0], 'test' + Math.random(), function done() {
    parseMessage(index + 1, messages, cb);
  });
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
