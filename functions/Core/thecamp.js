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
            return crawlDaumPopularNews();
        })
        .then(keywoardListStr => writeLetter(cookie, thecampInfo, letterList.length + 1, keywoardListStr))
        .then(code => checkLetterList(cookie, thecampInfo, myNickname))
        .then(currentLetterList => {
            if (currentLetterList.length === letterList.length + 1) {
                console.log('letter len ok', currentLetterList.length, ' <=> ', letterList.length + 1)
                ref.push().set({
                    status: true,
                    message: 'OK',
                    time: time
                }, err => {
                    if(err) {
                        this.handleError(err, res);
                    } else {
                        res.send({
                            success: true,
                        })
                    }
                })
                return true;
            } else {
                console.log('letter len mismatch', currentLetterList.length, ' <=> ', letterList.length + 1)
                ref.push().set({
                    status: false,
                    message: `Letter size not match ${currentLetterList.length} <-> ${letterList.length} + 1`,
                    time: time
                }, err => {
                    if(err) {
                        this.handleError(err, res);
                    } else {
                        res.send({
                            success: false,
                            message: 'msg len mismatch'
                        })
                    }
                })
                return false;
            }
        })
        .catch(err => {
            ref.push().set({
                status: false,
                message: err,
                time: time
            }, err2 => {
                this.handleError(err2 || err, res);
            })
        })
}

exports.handleError = (err, res) => {
    const result = {
        success: false,
        message: `${err}`
    }
    if (err && err.message) {
        console.error(`Cannot save data ${err.message}`)
        result.message += `\nCannot save data, Letter  ${err.message}`
    
        res.send({
            success: false,
            message: `Cannot save data, Letter  ${err.message}`
        })
    } else if (err) {
        console.error(`Cannot save data ${err}`)
        result.message += `\nCannot save data, Letter  ${err}`
    
        res.send({
            success: false,
            message: `Cannot save data, Letter  ${err}`
        })
    } else {
        console.error(`Cannot save data [Undefined error]`)
        result.message += `\nCannot save data, Letter [Undefined error]`
    
        res.send({
            success: false,
            message: `Cannot save data, Letter [Undefined error]`
        })
    }
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
                        regTime: item.regTime,
                        statusCd: item.statusCd,
                        statusNm: item.statusNm,
                        uptDate: item.uptDate,
                        uptTime: item.uptTime
                    }
                }).slice(0, 5)
            })
            return true;
        })
        .catch(err => {
            res.send({
                success: false,
                message: err || 'Fail'
            })
        })
}

const crawlDaumPopularNews = () => {
    return new Promise((resolve, reject) => {
        const cheerio = require('cheerio');
        const request = require('request');
        const options = {
            uri: 'https://news.daum.net/ranking/popular',
            // uri: 'https://google.com',
            method: 'GET',
            // headers: {
            //     accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            //     'accept-encoding': 'gzip, deflate, br',
            //     'accept-language': 'en-US,en;q=0.9,ko;q=0.8',
            //     'cache-control': 'no-cache',
            //     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36'
            // }
        }
        request.get(options, (err,httpResponse,body) => {
            // console.log('httpResponse', httpResponse);
            if (err) {
                reject(new Error(`Error while get daumn popular news site ${err.message}`));
                return;
            }
            const $ = cheerio.load(httpResponse.body);
            const newsList = $('ul[class=list_news2]').children('li')//.html()//.trim().replace(/\s/g, '');
            // console.log('body', httpResponse.body);
            let newsListStr = '';
            console.log('newsList len', newsList.length);
            const newListArr = [];
            newsList.each((i, ele) => {
                console.log('----\n',$(ele).children('.rank_num.rank_popular').text().trim())
                console.log('-title-\n', $($(ele).children('.cont_thumb')).children('.tit_thumb').text().trim())
                console.log('-body-\n', $($(ele).children('.cont_thumb')).children('.desc_thumb').text().trim())
                newListArr.push(`[${$(ele).children('.rank_num.rank_popular').text().trim()}]\n<b>title: ${$($(ele).children('.cont_thumb')).children('.tit_thumb').text().trim()}</b><br>\nbody:${$($(ele).children('.cont_thumb')).children('.desc_thumb').text().trim()}`)
                // rank = ele.contents().children('span[class=screen_out]');
                // console.log(rank.text())
            })
            newsListStr = newListArr.join('<br>');
            // if(newsList && newsList[0]) {
            //     newsList[0].children.forEach(child => {
            //             console.log('test2', child.childNodes);
            //             // childCheerio = cheerio.load(child.html());
            //         // if (child.prev.children) {

            //         // }
            //     })
            // }
            console.log('news list: ', newsListStr);
            resolve(newsListStr);
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
        if (!content || content.length <= 0) {
            console.log('Empty content detected!');
            reject(new Error('Empty content detected!'));
            return;
        }
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
                console.log('Check letter list api response: ', result.resultCd, result.listResult.filter(i => i.send_name === thecampInfo.send_name).length);
                resolve(result.listResult.filter(i => i.send_name === thecampInfo.send_name));
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