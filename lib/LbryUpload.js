'use strict';
const request = require("request");
const sqlite3 = require('sqlite3');
var s3 = require('s3');
const fs = require('fs');
const db = new sqlite3.Database('db.sqlite');


class LbryUpload {
    constructor() {
        db.run("CREATE TABLE IF NOT EXISTS syncd_videos (videoid TEXT UNIQUE, claimname TEXT)");
        performSyncronization();
    }
}

function setupPayload(row) {
    return new Promise(function (fulfill, reject) {
        let metadata = {
            author: "UC Berkeley",
            content_type: "video/mp4",
            description: row.description,
            language: "en",
            license: "Creative Commons 3.0: Attribution-NonCommercial-NoDerivs",
            nsfw: false,
            thumbnail: "http://berk.ninja/thumbnails/" + row.videoid,
            title: row.fulltitle
        }
        let filename = row.videoid + ".mp4";
        let payload = {
            method: "publish",
            params: {
                //claim names only allow chars and numbers and dashes
                name: "ucberkeley-" + row.videoid.replace(/[^A-Za-z0-9\-]/g, '-'),
                bid: 1.0,
                metadata: metadata,
                file_path: "/tmp/" + filename,
                /* it's not required to specify a fee at all if we want it to be 0
                I will include it anyway for futhre*/
                /*fee: {
                    LBC: {
                        amount: 0.0
                    }
                }*/
            }
        }
        fulfill({ payload: payload, filename: filename, videodata: row });
    });
}

function performSyncronization() {
    checkDaemon()
        .then(function (data) {
            console.log(data);
            getAllUnprocessedVideos()
                .then(function (data2) {
                    data2.forEach(function (row) {
                        setupPayload(row).then(payloadBundle => {
                            let s3Path = 'videos/' + payloadBundle.videodata.channelid + '/' + payloadBundle.filename;
                            let localPath = "/tmp/" + payloadBundle.filename;
                            downloadVideo(s3Path, localPath, payloadBundle.payload, payloadBundle.videodata)
                                .then(function (payload) {
                                    console.log(JSON.stringify(payload));
                                    publish(payload.payload, payload.filename, payload.videodata)
                                        .then(publishResponse => {
                                            console.log('Published ' + publishResponse.claimname);
                                            db.serialize(function () {
                                                var stmt = db.prepare("INSERT OR IGNORE INTO syncd_videos VALUES (?,?);");
                                                stmt.run(publishResponse.videodata.videoid, publishResponse.claimname);
                                                stmt.finalize();
                                            });
                                            var resultHandler = function (err) {
                                                if (err) {
                                                    console.log("unlink failed", err);
                                                } else {
                                                    console.log("file deleted");
                                                }
                                            }
                                            fs.unlink("/tmp/" + publishResponse.videodata.videoid + ".mp4", resultHandler);
                                        })
                                        .catch(console.log);
                                })
                                .catch(console.error);
                        });
                    });
                })
                .catch(console.error);
        })
        .catch(console.error);
}

/**
 * publish to lbry
 * @param {Object} payload 
 * @param {String} filename 
 * @param {Object} videodata
 */
function publish(payload, filename, videodata) {
    return new Promise(function (fulfill, reject) {
        var options = {
            method: 'POST',
            url: 'http://localhost:5279/lbryapi',
            body: JSON.stringify(payload)
        };

        request(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            if (response.statusCode !== 200 || JSON.parse(body).hasOwnProperty('fault')) {
                return reject(body);
            }
            else
                fulfill({ claimname: payload.params.name, videodata: videodata });
        });

    });
}

/**
 * download a given ucberkeley video to local storage 
 * @param {String} s3Path
 * @param {String} filename 
 * @param {Object} payload
 */
function downloadVideo(s3Path, filename, payload, videodata) {
    return new Promise(function (fulfill, reject) {
        let client = s3.createClient({
            maxAsyncS3: 20,     // this is the default
            s3RetryCount: 3,    // this is the default
            s3RetryDelay: 1000, // this is the default
            multipartUploadThreshold: 20971520, // this is the default (20 MB)
            multipartUploadSize: 15728640, // this is the default (15 MB)
            s3Options: {
                accessKeyId: process.env.s3_access_key,
                secretAccessKey: process.env.s3_secret_key,
                region: "us-east-2",
            },
        });

        let params = {
            localFile: filename,

            s3Params: {
                Bucket: "lbry-niko2",
                Key: s3Path,
            },
        };
        var downloader = client.downloadFile(params);
        downloader.on('error', function (err) {
            reject(err);
        });
        downloader.on('end', function () {
            console.log("done downloading");
            fulfill({ payload: payload, filename: filename, videodata: videodata });
        });
    });
}

/**
 * Call this function to verify if the daemon is up and responding
 * TODO: use a less expensive call
 */
function checkDaemon() {
    return new Promise(function (fulfill, reject) {
        var options = {
            method: 'POST',
            url: 'http://localhost:5279/lbryapi',
            body: '{"method":"status" }'
        };

        request(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            if (JSON.parse(body)[0].hasOwnProperty('is_running') && JSON.parse(body)[0].is_running === true)
                return fulfill(body);
            else reject(body);
        });

    });
}

function getAllUnprocessedVideos() {
    return new Promise(function (fulfill, reject) {
        //adapt this query to start from a different position in the database index. it's not a clean way to do it, but it's fast and for the sole time we need it, it's okay
        db.all("SELECT videoid,channelid,fulltitle,description, thumbnail, data FROM videos WHERE downloaded = 1 and data like '%Creative Commons%' limit 1 offset 16;", function (err, rows) {
            if (err) {
                return reject(error);
            }
            fulfill(rows);
        });
    });
}


module.exports = LbryUpload;