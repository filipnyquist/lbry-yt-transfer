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

function performSyncronization() {
    checkDaemon()
        .then(function (data) {
            console.log(data);
            getAllUnprocessedVideos()
                .then(function (data2) {
                    data2.forEach(function (row) {
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
                                name: "ucberkeley-" + row.videoid,
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

                        downloadVideo('videos/' + row.channelid + '/' + filename, "/tmp/" + filename, payload)
                            .then(function (data3) {
                                console.log(data3);
                                publish(data3)
                                    .then(function (data4) {
                                        console.log(data4);
                                        db.serialize(function () {
                                            var stmt = db.prepare("INSERT OR IGNORE INTO syncd_videos VALUES (?,?);");
                                            stmt.run(data4.videoid, data4.claimname);
                                            stmt.finalize();
                                        });
                                    })
                                    .catch(console.err);
                            })
                            .catch(console.err);
                    });
                })
                .catch(console.error);
        })
        .catch(console.error);
}

/**
 * publish to lbry
 * @param {Object} payload 
 */
function publish(payload) {
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
            let responseObject = {};
            responseObject.claimname = payload.params.name;
            responseObject.videoid = payload.params.name.replace('ucberkeley-', '');
            fulfill(responseObject);
        });

    });
}

/**
 * download a given ucberkeley video to local storage 
 * @param {String} path
 * @param {String} filename 
 * @param {Object} payload
 */
function downloadVideo(path, filename, payload) {
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
                Key: path,
            },
        };
        var downloader = client.downloadFile(params);
        downloader.on('error', function (err) {
            reject(err);
        });
        downloader.on('end', function () {
            console.log("done downloading");
            fulfill(payload);
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
            body: '{"method":"get","params":{"name":"what"} }'
        };

        request(options, function (error, response, body) {
            if (error) {
                return reject(error);
            }
            fulfill(body);
        });

    });
}

function getAllUnprocessedVideos() {
    return new Promise(function (fulfill, reject) {
        //adapt this query to start from a different position in the database index. it's not a clean way to do it, but it's fast and for the sole time we need it, it's okay
        db.all("SELECT videoid,channelid,fulltitle,description, thumbnail, data FROM videos WHERE downloaded = 1 and data like '%Creative Commons%' limit 1 offset 12;", function (err, rows) {
            if (err) {
                return reject(error);
            }
            fulfill(rows);
        });
    });
}


module.exports = LbryUpload;