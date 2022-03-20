import {Router} from 'express';
import JishoAPI from 'unofficial-jisho-api';

const jishoAPI = new JishoAPI;
const jishoRouter = new Router();

jishoRouter.get("/jlpt-level/:word", (req, res) => {
    jishoAPI.searchForPhrase(req.params.word)
    .then(result => res.json(result.data[0].jlpt))
    .catch(err => res.status(400).json('Error: ' + err))
})



export default jishoRouter;