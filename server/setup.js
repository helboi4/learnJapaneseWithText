import fetch from "node-fetch";
import fs from "fs";

export const populateJlptList = () => {
    fetch("https://jlpt-vocab-api.vercel.app/api/words/all", 
    {
        method: "GET",
        headers: {
            "content-type": "application/json"
        }
    })
    .then(response => response.json())
    .then(responseJson => JSON.stringify(responseJson))
    .then(data => fs.writeFile("bigJlpt.json", data, (err) => {
        if(err) throw err;
    }))
}
