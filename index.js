/* eslint-disable prefer-promise-reject-errors */
var cleanUpWord = function (text) {
    var words = [];
    var oldWords = text.split(' ').filter(x => x.includes);
    oldWords.forEach(element => {
        if ((element.charAt(0) === '$' && element.charAt(element.length - 1) === '}') && element.split('').filter(x => x == '$').length == 0) {} else if (element.includes('$')) {
            var wordsDeepScan = function (textSplit) {
                var open = false;
                var brace = false;
                var word = '';
                var wordCollect = [];
                var normalWord = false;
                textSplit.split('').forEach((x, y) => {
                    if (x == '$') {
                        if (word.length !== 0) {
                            wordCollect.push(word);
                            word = '';
                        }
                        open = true;
                    } else if (x === '{') {
                        brace = true;
                    } else if (x === '}') {
                        open = false;
                        brace = false;
                    } else if (open && brace) {

                    } else {
                        word += x;
                        if (textSplit.split('')[y + 1] === undefined) {
                            wordCollect.push(word);
                            word = '';
                        }
                    }
                });
                return wordCollect;
            };
            wordsDeepScan(element).forEach(x => words.push(x));
        } else {
            words.push(element);
        }
    });
    return words;
};

var coreFunctions = {
    syntaxResolver: class {
        constructor (syntax) {
            this.syntax = syntax;
            this.wordLength = function (text) {
                var count = {
                    entityCount: 0,
                    wordCount: 0
                };
                var oldWords = syntax.split(' ').filter(x => x.includes);
                var wordDeepScan = function (textSplit) {
                    var open = false;
                    var brace = false;
                    var normalWord = false;
                    var wordCount = 0;
                    var entityCount = 0;

                    textSplit.split('').forEach((x, y) => {
                        if (x == '$') {
                            if (normalWord) {
                                normalWord = false;
                                wordCount++;
                            }
                            open = true;
                        } else if (x == '{') {
                            brace = true;
                        } else if (x == '}') {
                            open = false;
                            brace = false;
                            if (textSplit.split('')[y + 1] !== undefined && textSplit.split('')[y + 1] !== '$') {
                                wordCount++;
                            }
                            entityCount++;
                        } else if (open && brace) {}
                    });
                    return {
                        entity: entityCount,
                        word: wordCount
                    };
                };
                oldWords.forEach(element => {
                    if ((element.charAt(0) === '$' && element.charAt(element.length - 1) === '}') && element.split('').filter(x => x == '$').length == 0) {
                        count.entityCount++;
                    } else if (element.includes('$')) {
                        var deepScan = wordDeepScan(element);
                        count.entityCount += deepScan.entity;
                        count.wordCount += deepScan.word;
                    } else {
                        count.wordCount++;
                    }
                });
                return count;
            };
        }

        bodyResolver () {
            var syntax = this.syntax;
            var { entityCount, wordCount } = this.wordLength(syntax);
            return {
                entityCount,
                wordCount,
                cleanUpWord: cleanUpWord(syntax)
            };
        }
    },
    correctBody: (currentString, resolvedData, resolver, language) => {
        var nString = currentString.toLocaleLowerCase(language);
        Object.entries(resolvedData).forEach(x => {
            var word = x[0];
            var entityName = x[1].entity;
            nString = nString.slice(0, x[1].phraseSlice.s) + '${' + entityName + '}' + nString.slice(x[1].phraseSlice.e, nString.length);
        });
        /* test te
           cleanUpWord(nString) = merhaba friday nasılsın , length == 3

           / BEFORE nString Change
           skeleton 1 (NOT CORRECT) = cleanUpWord.length === 3 resolver.cleanUpWord.length === 1 
           skeleton 2 (CORRECT ONE) = cleanUpWord.length === 3 resolver.cleanUpWord.length === 2

           / AFTER nString Change
           skeleton 1 (NOT CORRECT) = cleanUpWord.length === 3 resolver.cleanUpWord.length === 1
           skeleton 2 (CORRECT ONE) = cleanUpWord.length === 2 resolver.cleanUpWord.length === 2

            cleanUpWord.length === resolver.cleanUpWord.length BU EĞER İSKELET DOĞRU MU DİYE KONTROL EDİYOR
        */

        if (resolver.wordCount == resolver.cleanUpWord.length && cleanUpWord(nString).length === resolver.cleanUpWord.length) {
            var correctBody = cleanUpWord(nString).filter((x, y) => x.toLocaleLowerCase(language) !== resolver.cleanUpWord[y].toLocaleLowerCase(language)).length == 0;
            return correctBody && cleanUpWord(nString).length == resolver.cleanUpWord.length && Object.values(resolvedData).filter(data => data.phrase === '').length === 0;
        } else {
            return false;
        }
    }
};
class resolver {
    constructor (object, language) {
        var listener = new (class fileEvent extends require('events') {})();
        this.awaitListener = (obj) => {
            return new Promise((resolve) => {
                listener.emit('resolveEntity', obj, function (e) {
                    resolve(Object.assign(e, {
                        prop: e.phase
                    }));
                });
            });
        };
        this.language = language;
        this.com = listener;
        this.object = object;
    }

    resolve (text_) {
        var language = this.language;
        var text = text_.toLocaleLowerCase(language)
        var object = this.object;
        var resolvedArray = {};
        return new Promise(async (resolve, reject) => {
            var sentences = text.split(' ');
            var awaitListener = this.awaitListener;
            var deepPhraseScan = function (sentence, _from, analys) {
                var from = _from.filter(x => x.text !== 'sys.any');
                return new Promise(async (resolve, reject) => {
                    var all = sentence.split('');
                    var phrase = '';
                    for (var z = 0; z < all.length; z++) {
                        phrase += all[z];
                        for (var e = 0; e < from.length; e++) {
                            var detection = await awaitListener({
                                entity: from[e].text,
                                phase: phrase
                            });
                            if (detection.get) {
                                var lastItem = Object.values(resolvedArray).length == 0 ? false : Object.values(resolvedArray)[Object.values(resolvedArray).length - 1];
                                resolvedArray[phrase] = {
                                    phrase,
                                    entity: from[e].text,
                                    closeSentence: from[e].closeSentence,
                                    resolved: detection.val
                                };

                                if (analys.sentenceIndex == 0) {
                                    resolvedArray[phrase].phraseSlice = {
                                        s: 0,
                                        e: phrase.length
                                    };
                                } else if (analys.sentenceIndex == 1 && !from[e].closeSentence) {
                                    resolvedArray[phrase].phraseSlice = {
                                        s: analys.sentences.slice(0, analys.sentenceIndex).map(x => x.length).reduce((x, y) => x + y) + 1,
                                        e: analys.sentenceIndex == 0 ? phrase.length : analys.sentences.slice(0, analys.sentenceIndex).map(x => x.length).reduce((x, y) => x + y) + phrase.length + 1
                                    };
                                } else {
                                    if (from[e].closeSentence) {
                                        resolvedArray[phrase].phraseSlice = {
                                            s: lastItem.phraseSlice.e,
                                            e: lastItem.phraseSlice.e + phrase.length
                                        };
                                    } else {
                                        resolvedArray[phrase].phraseSlice = {
                                            s: analys.sentences.slice(0, analys.sentenceIndex).map(x => x.length).reduce((x, y) => x + y) + 1,
                                            e: analys.sentenceIndex == 0 ? phrase.length : analys.sentences.slice(0, analys.sentenceIndex).map(x => x.length).reduce((x, y) => x + y) + phrase.length + 2
                                        };
                                    }
                                }
                                phrase = '';
                            }
                        }
                    }
                    resolve(resolvedArray);
                });
            };
            for (var q = 0; q < sentences.length; q++) {
                var sentence = sentences[q];
                await deepPhraseScan(sentence, object.entity, {
                    sentenceIndex: q,
                    sentences: sentences.slice()
                });
            }

            var changedString = text;
            object.entity.filter(x => x.text == 'sys.any').forEach((item, index) => {
                
                Object.values(resolvedArray).filter(x=> !x.fixedPos).forEach(element => {
                    console.log(element)
                    var pre = changedString.slice(0, element.phraseSlice.s);
                    var post = changedString.slice(element.phraseSlice.e, changedString.length);
                    changedString = pre + '${' + element.entity + '}' + post;
                    element.fixedPos = true;
                    //changedString = changedString.slice(0, element.pos[0]) + '${' + element.entity + '}' + changedString.slice(element.pos[1], changedString.length);
                    //changedString = changedString.replace(element.phrase, '${' + element.entity + '}');
                });
                
                var cleaned = changedString;
                var pos = [];
                if (item.start === -1) {
                    cleaned = changedString.split(' ')[0].split(item.nextSentence.target)[0]; //TODO EXPERİMENTAL CAREFUL: BU EĞER ENTİTY 0 LOKASYONUNDAYSA ÇALIŞIR EĞER ${sys.any} merhaba gibiyse item.start === -1 olarak geliyor
                    pos = [0, cleaned.length];
                } else if(item.nextSentence.target === "") { // TODO EXPERIMENTAL FOR LAST WORD
                    
                    cleaned = changedString.split(' ')[changedString.split(' ').length-1]; //TODO EXPERİMENTAL CAREFUL: BU EĞER ENTİTY son LOKASYONUNDAYSA ÇALIŞIR EĞER merhaba ${sys.any} gibiyse item.nextSentence.target === "" olarak geliyor
                    pos = [changedString.length - cleaned.length, changedString.length];
                } else {
                    cleaned = changedString.slice(item.start).trim().split(' ')[0].split(item.nextSentence.target)[0]
                    pos = [item.start+1, item.start + cleaned.length +1];
                }

                /*
                else if (changedString.split(item.back)[1]) {
                    cleaned = changedString.split(item.back)[1];
                    pos = [0, changedString.split(item.back).length];
                    // console.log("Behind the any found");
                } else {
                    var splited = changedString.toString().split(item.lastSentence.target);
                    cleaned = splited[splited.length - 1];
                    pos = []
                }
                
                if (cleaned.split(item.foward)[0] && item.start !== -1) {
                    cleaned = cleaned.split(item.foward)[0];
                    cleaned = cleaned.split(item.nextSentence.target)[0];
                    pos = [0, cleaned.length];
                }
                */
                resolvedArray[cleaned.trim()] = {
                    phrase: cleaned.trim(),
                    phraseSlice: {
                        s: pos[0],
                        e: pos[1]
                    },
                    entity: 'sys.any'
                };
            });
            resolve({
                typingCorrect: coreFunctions.correctBody(text, resolvedArray, object.raw, language),
                resolvedArray
            });
        });
    }
}

var EntityEngine = {
    resolver,
    /**
     * Parse given text
     * @param {string} text_ - String for parsing
     */
    parse: (text, language) => {
        var text_ = text.toLocaleLowerCase(language)
        return new Promise((resolve, reject) => {
            var chars = text_.split('');
            var entities = [];
            chars.forEach((element, index) => {
                var text = text_;
                if (element === '$') {
                    if (entities.filter(x => !x.complete).length !== 0) {
                        reject({
                            info: 'Unexpected token',
                            code: 'a81',
                            pos: [index, index + 1],
                            value: text_
                        });
                    } else if(chars[index-1] === '}') {
                        reject({
                            info: 'Unrecoverable Syntax Error: sys.any entity must be seperated with space or sentence',
                            code: 'a81',
                            pos: [index, index + 1],
                            value: text_
                        });
                    } else {
                        var _lastSentence = text.slice(0, index - 1).trim().split(' ')[text.slice(0, index - 1).trim().split(' ').length - 1];
                        var closeSentence = entities.length == 0 ? false : entities[entities.length - 1].dot == index - 1;
                        entities.push({
                            start: index - 1,
                            hasBrace: false,
                            complete: false,
                            dot: index,
                            closeSentence,
                            text: '',
                            back: text.slice(0, index - 1),
                            foward: '',
                            lastSentence: _lastSentence.includes('$') || _lastSentence.includes('}') || _lastSentence.includes('{') ? {
                                isEntity: true,
                                target: cleanUp(_lastSentence)
                            } : {
                                isEntity: false,
                                target: cleanUp(_lastSentence)
                            },
                            nextSentence: null
                        });
                    }
                } else if (entities.filter(x => !x.complete).length !== 0 && (entities.filter(x => !x.hasBrace).length !== 0 && element !== '{')) {
                    reject({
                        info: 'Unexpected token',
                        code: 'a81',
                        pos: [index, index + 1],
                        value: text_
                    });
                } else if (element == '{') {
                    var found = entities.filter(x => !x.complete);
                    if (found.length == 0) {
                        reject({
                            info: 'Unexpected token',
                            code: 'a81',
                            pos: [index, index + 1],
                            value: text_
                        });
                    }
                    found[0].hasBrace = true;
                } else if (element == '.' && chars[index - 1] == '.') {
                    reject({
                        info: 'Duplicate dot',
                        code: 'a82',
                        pos: [index, index + 1],
                        value: text_
                    });
                } else if (element == '}') {
                    if (chars[index - 1] == '.') {
                        reject({
                            info: 'Uncomplete dot',
                            code: 'a83',
                            pos: [index, index + 1],
                            value: text_
                        });
                    }
                    var query = entities.filter(x => !x.complete);
                    if (query.length == 0) {
                        reject({
                            info: 'Unexpected token',
                            code: 'a81',
                            pos: [index, index + 1],
                            value: text_
                        });
                    }
                    var nextSentence = (text.slice(index + 1, text.length).trim().split(' ')[0]);
                    var ent = query[0];
                    ent.complete = true;
                    ent.dot = index;
                    ent.foward = text.slice(index + 1, text.length).trim();
                    ent.nextSentence = nextSentence.includes('$') ? {
                        isEntity: true,
                        target: cleanUpNextSentence(nextSentence)
                    } : {
                        isEntity: false,
                        target: cleanUpNextSentence(nextSentence)
                    };
                } else if (entities.filter(x => x.hasBrace && !x.complete).length !== 0) {
                    var Etext = entities.filter(x => x.hasBrace && !x.complete)[0];
                    Etext.text = Etext.text += element;
                } else if (element === ' ' && entities.filter(x => x.hasBrace && !x.complete).length !== 0) {
                    reject({
                        info: 'Entity bodies cannot have whitespaces',
                        code: 'a85',
                        pos: [index, index + 1],
                        value: text_
                    });
                } else if (element == ' ' && entities.filter(x => !x.hasBrace).length !== 0) {
                    reject({
                        info: 'Text cannot have empty spaces between brace and prefix',
                        code: 'a86',
                        pos: [index, index + 1],
                        value: text_
                    });
                }
            });
            var syntax = new coreFunctions.syntaxResolver(text_);
            if (entities.length !== 0 && entities[entities.length - 1].complete === false) {
                reject({
                    info: 'Unexpected token',
                    code: 'a80',
                    pos: [entities[entities.length - 1].start, entities[entities.length - 1].dot],
                    value: text_
                });
            } else if(entities.filter(x => x.text === '').length !== 0) {
                reject({
                    info: 'Empty Body',
                    code: 'a162',
                    pos: [entities.filter(x => x.text === '')[0].start, entities.filter(x => x.text === '')[0].dot],
                    value: text_
                });
            }
            resolve({
                raw: syntax.bodyResolver(),
                entity: entities.map(x => ({
                    start: x.start,
                    text: x.text,
                    back: x.back,
                    foward: x.foward,
                    closeSentence: x.closeSentence,
                    lastSentence: x.lastSentence,
                    nextSentence: x.nextSentence
                }))
            });
        });
    }
};

function cleanUp (text) {
    return text.split('').map(x => x == '$' ? null : x == '{' ? null : x == '}' ? ' ' : x).filter(x => x).join('').trim().split(' ')[0];
}

function cleanUpNextSentence (text) {
    return cleanUp(text.split('}${')[0]);
}

typeof module !== 'undefined' ? module.exports ? module.exports = EntityEngine : window.EntityEngine = EntityEngine : window.EntityEngine;
