const functions = require('firebase-functions');
global.admin = require('firebase-admin');
// Packages
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')({ origin: true })

const macroApi = express();

const serviceAccount = require('./service-account.json')
const projectInfo = {
    databaseURL: functions.config().project.database,
    storageBucket: functions.config().project.storage,
    projectId: functions.config().project.project_id
}
const thecampInfo = {
    email: functions.config().thecamp.email,
    password: functions.config().thecamp.password,
    traineeMgrSeq: functions.config().thecamp.trainee_mgr_seq
}
projectInfo['credential'] = global.admin.credential.cert(serviceAccount)
global.admin.initializeApp(projectInfo)

macroApi.use(cors);
macroApi.get('/', (req, res) => {
    res.send({
        success: true,
        message: 'It works!'
    })
})

exports.macro = functions.region('asia-northeast1').https.onRequest(macroApi);