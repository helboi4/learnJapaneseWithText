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
await kuroshiro.init(new KuromojiAnalyzer());

//method for deconjugating verbs/adjectives
const deconjugate = (word) => {
    let isKanji = true;
    let resultWords = [];

    isKanji = Kuroshiro.Util.isKanji(word.charAt(0));

    if(isKanji){
        let i=0;
        while(isKanji){
            i+=1;
            isKanji = Kuroshiro.Util.isKanji(word.charAt(i));
        }
        let okuriganaStartpoint = i;
        resultWords.push(word.substring(0, okuriganaStartpoint) + "い");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "う");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "る");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "す");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "く");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "ぶ");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "ぐ");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "む");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "ける");
        resultWords.push(word.substring(0, okuriganaStartpoint) + "きる");
    }
    // else{
    //     let endOfWord = word.substring(word.length - 5, word.length);
    //     let noOkurigana = null;
    //     if(endOfWord.includes("ない") || endOfWord.includes("なく") || endOfWord.includes("って") ||
    //     endOfWord.includes("いて") || endOfWord.includes("いで") || endOfWord.includes("える") || 
    //     endOfWord.includes("てる") || endOfWord.includes("わず") || endOfWord.includes("ます")){
    //         noOkurigana = word.substring(0, word.length - 2);
    //     }
    //     if(endOfWord.includes("ず") || endOfWord.includes("ぬ") ||endOfWord.includes("て")|| endOfWord.includes("り")){
    //         noOkurigana = word.substring(0, word.length - 1);
    //     }
    //     if(endOfWord.includes("られる")　endOfWord.includes("かった")　endOfWord.includes("ません")){
    //         noOkurigana = word.substring(0, word.length - 3);
    //     }
    // }
    console.log(resultWords);
    return resultWords;
    
}

const findWordInArray = (key, array) => {
    // The variable results needs var in this case (without 'var' a global variable is created)
    let result = null;
    for (let i = 0; i < array.length; i++) {
      if (array[i] == key) {
        result = array[i];
      }
    }
    return result;
  }

// method for searching through the bigJlpt.json
const searchForJlptLevelOfWord = (searchterm) => {
    let rawData = fs.readFileSync( __dirname + "/bigJlpt.json", (err, data) =>{
        if (err) throw err;
        return data;
    })
    const words = JSON.parse(rawData);
    const deconjugatedSearchterms = deconjugate(searchterm)
    const filteredWords = words.filter(entry => entry.word == searchterm || 
        entry.word == findWordInArray(entry.word, deconjugatedSearchterms));
    console.log(filteredWords);
    if(filteredWords[0]) return filteredWords[0].level;
    else return null;
}

//endpoint to get the JLPT level of a word
jishoRouter.get("/jlpt-level/:word", (req, res) => {
    let jlptLevel = null;
    try{
        jlptLevel = searchForJlptLevelOfWord(req.params.word);
    }catch(err){
        res.status(400).json("Error: " + err);
    }
    
    res.json(jlptLevel);   
})

//endpoint to get an array of the JLPT levels of the words contained in an entire text
jishoRouter.get("/jlpt-level/", (req, res) => {
    try{
        const wordArray = segmenter.segment(req.body.text);

        const resultArray = wordArray.map( (word) => {
            return searchForJlptLevelOfWord(word);
        })

        res.json(resultArray);

    }catch(err){
        res.status(400).json("Error: " + err)
    }
    
})

//endpoint to take an array/list of JLPT levels of words and find the average JLPT level
jishoRouter.get("/jlpt-level/average", (req, res) => {
    let wonderNumber = 0;
    const keyNumbers = {
        "jlpt-n1": 1,
        "jlpt-n2": 2,
        "jlpt-n3": 3,
        "jlpt-n4": 4,
        "jlpt-n5": 5
    }
    try{
        req.words.forEach(wordLevel => wonderNumber = keyNumbers.get(wordLevel));
        //will need to be changed words turns out to be a list
        wonderNumber = wonderNumber / req.words.length;
        const result = "jlpt-n" + wonderNumber;
        res.json(result)
    }
    catch(err){
        res.json(res.status(400).json("Error: " + err))
    };

})

export default jishoRouter;