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
    traineeName: functions.config().thecamp.trainee_name,
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

macroApi.post('/letter', (req, res) => {
    let cookie = '';
    let myNickname = '';
    let letterList = [];
    signInToTheCampAsEmail((err,httpResponse,body) => {
        if (err) {
            res.send({
                success: false,
                message: `Error while sign in ${err.message}`
            })
        }
        console.log('Sign in body ', body);
        cookie = httpResponse.headers['set-cookie'].join('; ');
        const result = JSON.parse(body);
        if (result.resultCd === '0000') {
            checkSignIn(cookie, (err,httpResponse,body) => {
                if (err) {
                    res.send({
                        success: false,
                        message: `Error while check signed in ${err.message}`
                    })
                }
                console.log('Check signed in body ', body);
                const result = JSON.parse(body);
                if (result.nickname) {
                    myNickname = result.nickname;

                    checkLetterList(cookie, (err,httpResponse,body) => {
                        if (err) {
                            res.send({
                                success: false,
                                message: `Error while check letter list ${err.message}`
                            })
                        }
                        console.log('Check letter list body ', body);
                        const result = JSON.parse(body);
                        if (result.resultCd === '0000') {
                            letterList = result.listResult.filter(i => i.nickname === myNickname);
                            console.log(`current letter size: ${letterList.length}`)
                            
                            crawlNaverKeywordRealtimeListener((keywordData) => {
                                if (keywordData) {
                                    writeLetter(cookie, letterList.length + 1, keywordData, (err,httpResponse,body) => {
                                        if (err) {
                                            res.send({
                                                success: false,
                                                message: `Error while write letter ${err.message}`
                                            })
                                        }
                                        console.log('Write letter body ', body);
                                        const result = JSON.parse(body);
                                        if (result.resultCd === '0000') {
                                            checkLetterList(cookie, (err,httpResponse,body) => {
                                                if (err) {
                                                    res.send({
                                                        success: false,
                                                        message: `Error while check letter list agin ${err.message}`
                                                    })
                                                }
                                                console.log('Check letter list agin body ', body);
                                                const result = JSON.parse(body);
                                                if (result.resultCd === '0000') {
                                                    const tempLetterList = result.listResult.filter(i => i.nickname === myNickname);
                                                    if (tempLetterList.length === letterList.length + 1) {
                                                        res.send({
                                                            success: true,
                                                            message: `Good day bro.`
                                                        })
                                                    } else {
                                                        res.send({
                                                            success: false,
                                                            message: `before letter length and after letter length not matched ${tempLetterList.length} <=> ${letterList.length} + 1`
                                                        })
                                                    }
                                                } else {
                                                    res.send({
                                                        success: false,
                                                        message: `Error while check letter list agin ${result.resultCd}`
                                                    })
                                                }
                                            })
                                        } else {
                                            res.send({
                                                success: false,
                                                message: `Error while write letter ${result.resultCd}`
                                            })
                                        }
                                    })
                                } else {
                                    res.send({
                                        success: false,
                                        message: `Error while crawl naver keyword.`
                                    })
                                }
                            })
                        } else {
                            res.send({
                                success: false,
                                message: `Error while check letter list ${result.resultCd}`
                            })
                        }
                    })
                } else {
                    res.send({
                        success: false,
                        message: `Error while check signed in.`
                    })
                }
            })
        } else {
            res.send({
                success: false,
                message: `Error while sign in ${result.resultCd}`
            })
        }
    })
})

const crawlNaverKeywordRealtimeListener = (callbackFunc) => {
    const cheerio = require('cheerio');
    const request = require('request');
    const options = {
        uri: 'https://datalab.naver.com/keyword/realtimeList.naver',
        method: 'GET',
        headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
            'cache-control': 'no-cache',
            referer: 'https://datalab.naver.com/local/trend.naver',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36'
        }
    }
    request.get(options, (err,httpResponse,body) => {
        if (err) {
            console.log(`Error while get naver keyword site ${err.message}`)
            callbackFunc(null);
        }
        const $ = cheerio.load(body);
        const realtimeKeywordList = $('div[class=list_group]').text().trim().replace(/\s/g, '');
        console.log('keyworad list: ', realtimeKeywordList);
        callbackFunc(realtimeKeywordList);
    })
}

const writeLetter = (cookie, lastCount, content, callbackFunc) => {
    const request = require('request');
    const options = {
        uri: 'https://www.thecamp.or.kr/consolLetter/insertConsolLetterA.do',
        method: 'POST',
        headers: {
            Cookie: cookie
        },
        form: {
            boardDiv: 'sympathyLetter',
            tempSaveYn: 'N',
            sympathyLetterContent: `<p>${content}</p>`,
            sympathyLetterSubject: `${thecampInfo.traineeName} 기 살리기 T-${lastCount}`,
            traineeMgrSeq: thecampInfo.traineeMgrSeq,
        }
    }
    request.post(options, callbackFunc)
}

const checkLetterList = (cookie, callbackFunc) => {
    const request = require('request');
    const options = {
        uri: 'https://www.thecamp.or.kr/consolLetter/selectConsolLetterA.do',
        method: 'POST',
        headers: {
            Cookie: cookie
        },
        form: {
            traineeMgrSeq: thecampInfo.traineeMgrSeq,
            tempSaveYn: 'N',
            _url: 'https://www.thecamp.or.kr/consolLetter/viewConsolLetterMain.do',
            keepSearchConditionUrlKey: 'consolLetter'
        }
    }
    request.post(options, callbackFunc)
}

const checkSignIn = (cookie, callbackFunc) => {
    const request = require('request');
    const options = {
        uri: 'https://www.thecamp.or.kr/member/selectMemberTypeA.do',
        method: 'POST',
        headers: {
            Cookie: cookie
        }
    }
    request.post(options, callbackFunc)
}

const signInToTheCampAsEmail = (callbackFunc) => {
    const request = require('request');
    const options = {
        uri: 'https://www.thecamp.or.kr/login/loginA.do',
        method: 'POST',
        form: {
            state: 'email-login',
            autoLoginYn: 'N',
            userId: thecampInfo.email,
            userPwd: thecampInfo.password
        }
    }
    request.post(options, callbackFunc)
}

exports.macro = functions.region('asia-northeast1').https.onRequest(macroApi);