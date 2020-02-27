exports.sendLetter = (thecampInfo, admin, res) => {
    let cookie = '';
    let myNickname = '';
    let letterList = [];
    const time = new Date().getTime();

    const ref = admin.database().ref('letter/status')

    signInToTheCampAsEmail(thecampInfo)
        .then(currentCookie => {
            cookie = currentCookie;
            return checkSignIn(cookie)
        })
        .then(nickname => {
            myNickname = nickname;
            return checkLetterList(cookie, thecampInfo, myNickname);
        })
        .then(currentLetterList => {
            letterList = currentLetterList;
            return crawlNaverKeywordRealtimeListener();
        })
        .then(keywoardListStr => writeLetter(cookie, thecampInfo, letterList.length + 1, keywoardListStr))
        .then(code => checkLetterList(cookie, thecampInfo, myNickname))
        .then(currentLetterList => {
            if (currentLetterList.length === letterList.length + 1) {
                ref.push().set({
                    status: true,
                    message: 'OK',
                    time: time
                }, err => {
                    if (err) {
                        console.error(`Cannot save data ${err.message}`)
                        res.send({
                            success: false,
                            message: `Cannot save data ${err.message}`
                        })
                    } else {
                        res.send({
                            success: true,
                            message: 'Good bye bro.'
                        })
                    }
                })
                return true;
            } else {
                ref.push().set({
                    status: false,
                    message: `Letter size not match ${currentLetterList.length} <-> ${letterList.length} + 1`,
                    time: time
                }, err => {
                    const result = {
                        success: false,
                        message: `Letter size not match ${currentLetterList.length} <-> ${letterList.length} + 1`
                    }
                    if (err) {
                        console.error(`Cannot save data ${err.message}`)
                        result.message += `\nCannot save data, Letter  ${err.message}`
                    } 
                    
                    res.send({
                        success: false,
                        message: `Cannot save data, Letter  ${err.message}`
                    })
                })
                return false;
            }
        })
        .catch(err => {
            ref.push().set({
                status: false,
                message: err,
                time: time
            }, err => {
                const result = {
                    success: false,
                    message: `${err}`
                }
                if (err) {
                    console.error(`Cannot save data ${err.message}`)
                    result.message += `\nCannot save data, Letter  ${err.message}`
                } 
                
                res.send({
                    success: false,
                    message: `Cannot save data, Letter  ${err.message}`
                })
            })
        })
}

exports.getLetterList = (thecampInfo, res) => {
    let cookie = '';
    let myNickname = '';
    signInToTheCampAsEmail(thecampInfo)
        .then(currentCookie => {
            cookie = currentCookie;
            return checkSignIn(cookie)
        })
        .then(nickname => {
            myNickname = nickname;
            return checkLetterList(cookie, thecampInfo, myNickname);
        })
        .then(currentLetterList => {
            res.send({
                success: currentLetterList !== null,
                data: currentLetterList.map(item => {
                    return {
                        seq: item.seq,
                        regDate: item.regDate,
                        statusCd: item.statusCd,
                        statusNm: item.statusNm,
                    }
                }).slice(0, 5)
            })
            return true;
        })
        .catch(err => {
            res.send({
                success: false,
                message: err
            })
        })
}

const crawlNaverKeywordRealtimeListener = () => {
    return new Promise((resolve, reject) => {
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
                reject(new Error(`Error while get naver keyword site ${err.message}`))
            }
            const $ = cheerio.load(body);
            const realtimeKeywordListStr = $('div[class=list_group]').text().trim().replace(/\s/g, '');
            console.log('keyworad list: ', realtimeKeywordListStr);
            resolve(realtimeKeywordListStr);
        })
    })
}

const writeLetter = (cookie, thecampInfo, lastCount, content) => {
    return new Promise((resolve, reject) => {
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
        request.post(options, (err, httpResponse, body) => {
            if (err) {
                reject(new Error(`Error while write letter ${err.message}`))
            }
            console.log('Write letter body ', body);
            const result = JSON.parse(body);
            if (result.resultCd === '0000') {
                resolve(result.resultCd)
            } else {
                reject(new Error(`Error while write letter ${result.resultCd}`))
            }
        })
    })
}

const checkLetterList = (cookie, thecampInfo, myNickname) => {
    return new Promise((resolve, reject) => {
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
        request.post(options, (err, httpResponse, body) => {
            if (err) {
                reject(new Error(`Error while check letter list ${err.message}`))
            }
            console.log('Check letter list body ', body);
            const result = JSON.parse(body);
            if (result.resultCd === '0000') {
                resolve(result.listResult.filter(i => i.nickname === myNickname));
            } else {
                reject(new Error(`Error while check letter list ${result.resultCd}`))
            }
        })
    })
}

const checkSignIn = (cookie) => {
    return new Promise((resolve, reject) => {
        const request = require('request');
        const options = {
            uri: 'https://www.thecamp.or.kr/member/selectMemberTypeA.do',
            method: 'POST',
            headers: {
                Cookie: cookie
            }
        }
        request.post(options, (err,httpResponse,body) => {
            if (err) {
                reject(new Error(`Error while check signed in ${err.message}`))
            }
            console.log('Check signed in body ', body);
            const result = JSON.parse(body);
            if (result.nickname) {
                resolve(result.nickname);
            } else {
                reject(new Error(`Error while check signed in.`))
            }
        })
    });
}

const signInToTheCampAsEmail = (thecampInfo) => {
    return new Promise((resolve, reject) => {
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
        request.post(options, (err,httpResponse,body) => {
            if (err) {
                reject(new Error(`Error while sign in ${err.message}`))
            }
            const result = JSON.parse(body);
            if (result.resultCd === '0000') {
                const cookie = httpResponse.headers['set-cookie'].join('; ');
                resolve(cookie);
            } else {
                reject(new Error(`Error while sign in ${result.resultCd}`))
            }
        })
    })
}