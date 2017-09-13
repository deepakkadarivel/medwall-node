const uuidv1 = require('uuid/v1');
const aws = require('aws-sdk');
const config = require('../../config/env/development');

var AWS_ACCESS_KEY = config.accessKeyId;
var AWS_SECRET_KEY = config.secretAccessKey;
var S3_BUCKET = config.bucket;

const upload = (req, res) => {
    aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});

    var s3 = new aws.S3();
    var options = {
        Bucket: S3_BUCKET,
        Key: req.query.file_name,
        Expires: 60,
        ContentType: req.query.file_type,
        ACL: 'public-read'
    };
    
    s3.getSignedUrl('putObject', options, function (err, data) {
        if (err) return res.send('Error with S3');

        res.json({
            signed_request: data,
            url: 'https://s3.amazonaws.com/' + S3_BUCKET + '/' + uuidv1()
        })
    })
};

module.exports = {
  upload
};