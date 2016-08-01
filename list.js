var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Reportback = mongoose.model('Reportback', new Schema({
  time: String,
  phone: String,
  oip: String,
  campaign: String,
  url: String,
  nid: String
}), 'recovery');

mongoose.connect('mongodb://localhost/');

var csv = require("fast-csv");
var stream = fs.createWriteStream('rb_join', {
  flags: 'w'
});

var endPid;

function endStream() {
  console.log("Ending write stream");
  stream.end();
}

function resetEndStream() {
  clearTimeout(endPid);
  endPid = setTimeout(endStream, 15 * 1000);
}

csv
 .fromPath("rb_missing.csv")
 .on("data", function(data){
     var nid = data[2] + '';
     var mobile = '1' + data[3];
     var url = data[4];
    //  console.log(mobile, nid);
     Reportback.findOne({$and: [{phone: mobile}, {campaign: nid}]}, function(err, doc) {
        if (err) {
          console.log(err);
        }

        if (doc) {
          resetEndStream();
          console.log(`saving ${data[0]}`);
          stream.write(`rb-${doc.id}.png ${url} \n`);
        }
     });
 })
 .on("end", function(){
     console.log("done loading csv");
 });
