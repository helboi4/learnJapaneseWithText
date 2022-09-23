import express from "express";
import jishoRouter from "./jisho.js";
import { populateJlptList } from "./setup.js";

const app = express();
const port = 8000;

app.use(express.json());

app.use('/jisho', jishoRouter);

populateJlptList();

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})

export default app;