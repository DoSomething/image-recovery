exports.average = 0;
exports.samples = 0;

// from http://stackoverflow.com/questions/23003252/window-performance-now-equivalent-in-nodejs
exports.clock = function(start) {
  if ( !start ) return process.hrtime();
  var end = process.hrtime(start);
  return Math.round((end[0]*1000) + (end[1]/1000000));
}

exports.addRunTime = function(time) {
  // New average = old average * (n-1)/n + new value /n
  // from http://stackoverflow.com/a/23493727/2129670
  exports.samples++;
  exports.average = exports.average * (exports.samples - 1) / exports.samples + time / exports.samples;
}
