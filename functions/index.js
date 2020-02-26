const functions = require('firebase-functions');
const admin = require('firebase-admin');
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
    traineeName: functions.config().thecamp.trainee_name,
    email: functions.config().thecamp.email,
    password: functions.config().thecamp.password,
    traineeMgrSeq: functions.config().thecamp.trainee_mgr_seq
}
projectInfo['credential'] = admin.credential.cert(serviceAccount)
admin.initializeApp(projectInfo)

macroApi.use(cors);
macroApi.get('/', (req, res) => {
    res.send({
        success: true,
        message: 'It works!'
    })
})

macroApi.post('/letter', (req, res) => {
    const thecamp = require('./Core/thecamp');
    thecamp.sendLetter(thecampInfo, admin, res)
})

macroApi.get('/letter', (req, res) => {
    const thecamp = require('./Core/thecamp');
    thecamp.getLetterList(thecampInfo, res)
})


exports.macro = functions.region('asia-northeast1').https.onRequest(macroApi);