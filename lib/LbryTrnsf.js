'use strict';
const logger = require('winston');
const ytdl = require('youtube-dl');
var path = require('path');
var fs   = require('fs');
class LbryTrnsf {
  constructor(config) {
    logger.info('[LbryTrnsf] : Initializing Modules, booting the spaceship...');
    this.config = config;
    this.init(config);
  }

  init(config) { 
    logger.debug('[LbryTrnsf] : Program is initialized!');
  }

}
//Functions here...
  function downPlaylist(url, db) {
//Add db check to this function and make it fully done...
    var video = ytdl(url);

    video.on('error', function error(err) {
      console.log('error 2:', err);
    });

    var size = 0;
    video.on('info', function (info) {
      /*
      info.fulltitle, title of the video
      info.id, id of the video
      info.thumbnails, array of thumbnails (each obj contains id and url)
      info.uploader, name of the uploader
      info.uploader_id, uploader id
      info.description, the video description
      info.thumbnail, the thumbnail of the video downloading
      */
      size = info.size;
      console.log('\n Downloading: ' + info.title);
      console.log(info);
      var output = path.join(__dirname + '/', info._filename + '.mp4');
      video.pipe(fs.createWriteStream(output));
    });

    var pos = 0;
    video.on('data', function data(chunk) {
      pos += chunk.length;
      // `size` should not be 0 here.
      if (size) {
        var percent = (pos / size * 100).toFixed(2);
        process.stdout.cursorTo(0);
        process.stdout.clearLine(1);
        process.stdout.write(percent + '%');
      }
    });

    video.on('next', downPlaylist);

  }

module.exports = LbryTrnsf;