const express = require('express');
const crypto =  require('crypto');
const serverless = require('aws-serverless-express');
const AWS = require('aws-sdk');

//Configure AWS
AWS.config.update({ region: 'eu-west-2' });

//Initiate server
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const app = express();

app.use(express.json());

//Rehash route
app.post('/rehash', (req, res) => {
    const hash = req.body.hash;
    const user = req.body.user;

    rehash(hash, user, res);
});


//Rehash data
function rehash(hash, user, res) {
    try {
        //Prepare data
        const originalHash = hash;
        const timestamp = Date.now();   //Generate a timestamp
        const nonce = crypto.randomBytes(16).toString('hex');
        const dataToHash = originalHash + user + timestamp + nonce;  //Concatenate original hash, timestamp, etc.
        const rehashedValue = crypto.createHash('sha256').update(dataToHash).digest('hex');  //Hash the concatenated data

        //Insert data into DynamoDB
        const params = {
            TableName: 'blockchainHash',
            Item: {
                user,
                timestamp,
                originalHash,
                hash: rehashedValue,
                nonce
            },
        };

        //Error handler
        if(user != '' && originalHash != '') {
            dynamoDB.put(params, (error) => {
                if (error) {
                    console.error('DynamoDB Error:', error.message);
                    res.status(500).json({ error: 'DB Conncetion Error' });
                } else {
                    res.status(200).json({ rehashedValue });
                }
            });
        } else {
            console.error('No enouth data!');
            res.status(500).json({ error: 'Not enougth data!' });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

//Create server
const server = serverless.createServer(app);

exports.handler = (event, context) => serverless.proxy(server, event, context); //Define the AWS Lambda handler function
