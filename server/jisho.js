import {Router} from 'express';
import JishoAPI from 'unofficial-jisho-api';
import TinySegmenter from 'tiny-segmenter';
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import Conjugator from "jp-verbs";
import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

const jishoAPI = new JishoAPI;
const jishoRouter = new Router();
const segmenter = new TinySegmenter();
const __dirname = dirname(fileURLToPath(import.meta.url));
const kuroshiro = new Kuroshiro();
const particles = ["の", "に", "で", "へ", "を", "にて", "について", "は", "が", 
"から", "まで", "と", "や", "ね", "とか", "よ", "な", "も", "か",
"ばかり", "ばっかり", "ばっか", "だけ", "しか", "ながら", "なら", "ので", "さえ", "こそ", "やら",
"とも", "なり", "として", "にとって", "のみ", "すら", "けれど", "ものの", "ね", "わ",
"さ", "ぜ", "ぞ", "って", "っけ", "かい", "かな", "かしら", "のに", "たって", "し"]
await kuroshiro.init(new KuromojiAnalyzer());

//TODO Refactor all of this so that the d

//method for deconjugating verbs/adjectives
const deconjugate = (word) => {
    // let isKanji = true;
    // let resultWords = [];

    // isKanji = Kuroshiro.Util.isKanji(word.charAt(0));

    // if(isKanji){
    //     let i=0;
    //     while(isKanji){
    //         i+=1;
    //         isKanji = Kuroshiro.Util.isKanji(word.charAt(i));
    //     }
    //     let okuriganaStartpoint = i;
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "い");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "う");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "る");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "す");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "く");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "ぶ");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "ぐ");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "む");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "ける");
    //     resultWords.push(word.substring(0, okuriganaStartpoint) + "きる");
    // }
    // else{
    //     let endOfWord = word.substring(word.length - 5, word.length);
    //     let noOkurigana = null;
    //     if(endOfWord.includes("ない") || endOfWord.includes("なく") || endOfWord.includes("って") ||
    //     endOfWord.includes("いて") || endOfWord.includes("いで") || endOfWord.includes("える") || endOfWord.includes("れる") ||
    //     endOfWord.includes("てる") || endOfWord.includes("わず") || endOfWord.includes("ます") || endOfWord.includes("れば")){
    //         noOkurigana = word.substring(0, word.length - 2);
    //     }
    //     if(endOfWord.includes("ず") || endOfWord.includes("ぬ") ||endOfWord.includes("て")|| endOfWord.includes("り") 
    //     || endOfWord.includes("ば") || endOfWord.includes("れ") || endOfWord.includes("ろ") || endOfWord.includes("よ")){
    //         noOkurigana = word.substring(0, word.length - 1);
    //     }
    //     if(endOfWord.includes("られる") || endOfWord.includes("かった") || endOfWord.includes("ません") || endOfWord.includes("ている")
    //     || endOfWord.includes("てある") || endOfWord.includes("ないで")){
    //         noOkurigana = word.substring(0, word.length - 3);
    //     }
    //     if(endOfWord.includes("られます") || endOfWord.includes("なかった") || endOfWord.includes("られない") || endOfWord.includes("っている")
    //     || endOfWord.includes("ってある")){
    //         noOkurigana = word.substring(0, word.length - 3);
    //     }
    // }
    // return resultWords;
    let result = Conjugator.unconjugate(word);
    result = result.map(entry => entry.base);
    return result;
}

//method for deconjugating verbs/adjectives and getting info about tense
const deconjugateWithTenseInfo = (word) => {
    let result = Conjugator.unconjugate(word);
    result = result.map(entry => new Object(
        {word: entry.base, tenseInfo: entry.derivationPath }))
    return result;
}

const findWordInArray = (key, array) => {
    let result = null;
    for (let i = 0; i < array.length; i++) {
      if (array[i] == key) {
        result = array[i];
      }
    }
    return result;
  }

// method for searching through the bigJlpt.json
const searchForWord = (searchterm, isWithTenseInfo = false) => {

    let filteredWords = [];

    if(!isNaN(searchterm)) return filteredWords;

    let isParticle = particles.filter(particle => particle == searchterm);

    if(isParticle.length > 0){
        return filteredWords;
    }

    let rawData = fs.readFileSync( __dirname + "/bigJlpt.json", (err, data) =>{
        if (err) throw err;
        return data;
    })
    const words = JSON.parse(rawData);
    filteredWords = words.filter(entry => entry.word == searchterm);
    if(filteredWords.length <= 0){
        const deconjugatedSearchterms = deconjugate(searchterm);
        filteredWords = words.filter(entry => entry.word == 
        findWordInArray(entry.word, deconjugatedSearchterms));
        
    } 

    return filteredWords;
}

//method for extracting jlpt level of word
const fetchJlptLevelOfWord = (searchterm) => {

    let filteredWords = searchForWord(searchterm);
    
    if(filteredWords.length <=0) return null;

    if(filteredWords[0]) return filteredWords[0].level;
    else return null;
}

//method for extracting definition of word
const fetchDefinitionOfWord = (searchterm) => {
    let filteredWords = searchForWord(searchterm);

    if(filteredWords.length <=0) return null;

    if(filteredWords[0]) return filteredWords[0].meaning;
    else return null;
}

//endpoint to get the JLPT level of a word
jishoRouter.get("/jlpt-level/:word", (req, res) => {
    let jlptLevel = null;
    try{
        jlptLevel = fetchJlptLevelOfWord(req.params.word);
    }catch(err){
        res.status(400).json("Error: " + err);
    }
    
    res.json(jlptLevel);   
})

//endpoint to get an array of the JLPT levels of the words in a whole text
jishoRouter.get("/jlpt-level/", (req, res) => {
    try{
        const wordArray = segmenter.segment(req.body.text);

        const resultArray = wordArray.map( (word) => {
            return fetchJlptLevelOfWord(word);
        })
        res.json(resultArray);

    }catch(err){
        res.status(400).json("Error: " + err)
    }
    
})

//endpoint to get the JLPT level of a word
jishoRouter.get("/jlpt-level/:word", (req, res) => {
    let jlptLevel = null;
    try{
        jlptLevel = fetchJlptLevelOfWord(req.params.word);
    }catch(err){
        res.status(400).json("Error: " + err);
    }
    
    res.json(jlptLevel);   
})

//endpoint for getting an array of the definitions of the words in a whole text
jishoRouter.get("/definition", (req, res) => {
    try{
        const wordArray = segmenter.segment(req.body.text);

        const resultArray = wordArray.map( (word) => {
            return fetchDefinitionOfWord(word);
        })
        res.json(resultArray);

    }catch(err){
        res.status(400).json("Error: " + err)
    }
})

//endpoint to get the definition of a word
jishoRouter.get("/definition/:word", (req, res) => {
    let jlptLevel = null;
    try{
        jlptLevel = fetchDefinitionOfWord(req.params.word);
    }catch(err){
        res.status(400).json("Error: " + err);
    }
    
    res.json(jlptLevel);   
})

//endpoint that will fetch definitions, jlpt levels and conjugations of words
jishoRouter.get("/def-level-tense", (req, res) => {

})

export default jishoRouter;