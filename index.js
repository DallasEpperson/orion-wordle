//todo add proper config
const broadcastChannel = "CDN2Z9SFJ";
const wordResetTime = "06:00Z";
const brainFile = "plugins/orion-wordle/brain.json";
const wordFile = "plugins/orion-wordle/sgb-words.txt";
const wordLength = 5; // Classic Wordle = 5
const guessMax = 6;

const fs = require("fs");

let sentenceSyntax = /wordle ((guess) ["'`]?([a-zA-Z]+)["'`]?|(stat(?:istic)?s)|(help))/i;

/**
 * @type [string]
 */
var wordList = [];

const isDirectMessage = (event) => {
    return event.channel.startsWith('D');
}

const loadBrain = () => {
    try{
        let rawData = fs.readFileSync(brainFile);
        console.log('loaded brain');
        return JSON.parse(rawData);
    } catch { //brainFile no exist
        console.log('creating brain');
        let newBrain = {
            currentWord: wordList[Math.floor(Math.random()*wordFile.length)],
            wordPicked: (new Date()).toISOString()
        };
        fs.writeFileSync(brainFile, JSON.stringify(newBrain, null, 2));
        return newBrain;
    }
};

const saveBrain = (brain) => {
    console.log('saving brain');
    fs.writeFileSync(brainFile, JSON.stringify(brain, null, 2));
};

/**Handle the Guess scenario.
 * @param {RegExpExecArray} match Original message match.
 * @param {*} event Slack event.
 * @param {function(string,string):void} sendMsg Callback to send message to Slack.
 */
const handleGuess = (match, event, sendMsg) => {
    if(!isDirectMessage(event)){
        sendMsg("Only send wordle guesses as a direct message to me!", event.channel);
        return;
    }

    const guess = match[3].toLowerCase();
    const userName = event.user;

    if(guess.length !== wordLength){
        sendMsg(`Your guess is not ${wordLength} letters long!`, event.channel);
        return;
    }

    let brain = loadBrain();

    if(brain.guesses && brain.guesses[userName] && brain.guesses[userName].length >= guessMax){
        sendMsg("You have already used all of your guesses!", event.channel);
        return;
    }

    if(wordList.indexOf(guess) === -1){
        sendMsg("That isn't a word. Try again.", event.channel);
        return;
    }


    //todo render guesses image
    if(guess === brain.currentWord.toLowerCase()){
        sendMsg("Good job", event.channel);
    } else {
        brain.guesses = brain.guesses || {};
        brain.guesses[userName] = brain.guesses[userName] || [];
        brain.guesses[userName].push(guess);
        saveBrain(brain);
        if(brain.guesses[userName].length >= guessMax) {
            sendMsg("No, and that was your last guess. Try again tomorrow!", event.channel);
            return;
        }else {
            sendMsg("Nope", event.channel);
            return;
        }
    }
};

const handleStats = (match, event, sendMsg) => {
    sendMsg("TODO handleStats", event.channel);
    //sendMsg("test sending to broadcastChannel", broadcastChannel);
};

const handleHelp = (match, event, sendMsg) => {
    sendMsg(`
Try to guess today's ${wordLength}-letter word. 

Type \`wordle guess abcde\` to guess "abcde".
You only have ${guessMax} chances to correctly guess the word, but I will help you.
Each letter you have in the correct position, I will mark in green :large_green_square:.
Each letter which exists in the word but is in the wrong position, I will mark in yellow :large_yellow_square:.
Incorrect letters I will mark in black :black_square:.
The word will switch to a new random word every day.

Type \`wordle stats\` to show your statistics.

Type \`wordle help\` to show this message.
    `, event.channel);
};

module.exports.PluginName = 'Wordle';

module.exports.init = () => {
    const wordFileContent = fs.readFileSync(wordFile).toString();
    wordList = wordFileContent.trim().split("\n")
        .map((a) => {return a.trim();})
        .filter((a) => {return a.length === wordLength;});
    let brain = loadBrain();
    //todo calculate next wordReset properly
    brain.nextWordReset = (new Date((new Date().toISOString().split('T')[0]) + "T" + wordResetTime)).toISOString();
    console.log(brain);
    console.log(`now: ${(new Date()).toISOString()}`);

    //todo setInterval for 15 seconds
    // determine if now is past nextWordReset
    // announce today's stats
    // pick new word
    // set new nextWordReset
};

module.exports.CanHandleMessage = function(messageText){
    let syntaxPasses = sentenceSyntax.test(messageText.toLowerCase());
    if (!syntaxPasses) return false;
    return true;
};

module.exports.HandleMessage = function(event, sendMsg){
    let match = sentenceSyntax.exec(event.text.toLowerCase());

    if(match[2]) {
        handleGuess(match, event, sendMsg);
        return;
    }

    if(match[4]) {
        handleStats(match, event, sendMsg);
        return;
    }

    if(match[5]) {
        handleHelp(match, event, sendMsg);
        return;
    }
};