const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const IPFS = require('ipfs-core');
const app = express();
const toBuffer = require('it-to-buffer');
const fs = require('fs');

app.use(express.static('static'));

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

//add other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));

//start app 
const port = process.env.PORT || 3000;
const ipfs = IPFS.create();

app.post('/storeFile', async (req, res) => {
    try {

        if(!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } 
        else {
            let file = req.files.file;
            let id = req.query.id;
            await (await ipfs).files.mkdir('/' + id)
                .catch(e => {
                    res.send({
                        status: false,
                        message: 'This id already exists!'      // create unique directory
                    })
                });        

            await (await ipfs).files.write('/' + file.name, file.data, { create: true });     // add file to IPFS
            
            await (await ipfs).files.mv('/' + file.name, '/' + id);     // move file to new folder
            
            const result = await (await ipfs).files.stat('/' + id + '/' + file.name);
            
            //send response
            res.send({
                status: true,
                message: 'File is uploaded',
                data: {
                    name: file.name,
                    mimetype: file.mimetype,
                    size: file.size
                },
                hash: result.cid.toString(),
                path: '/' + id + '/' + file.name
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});


app.get('/getFile', async (req, res) => {
    try {

        if (req.query.path !== undefined) {
            
            const path = req.query.path;

            const fileName = path.split(/[/ ]+/).pop();     //gets the string after last '/'
            
            const bufferedContents = await toBuffer(
                (await ipfs).files.read(path)
            );

            const filePath = 'static/' + fileName;
            
            fs.appendFile(filePath, bufferedContents, function (err) {
                if (err) throw err;
            })

            res.download(filePath, fileName, (err) => {
                if (err) {
                  res.status(500).send('error');
                }
                else {
                  console.log('file was downloaded')
                }
            })
            
        } else {
            res.status(400).send("Query parameter (hash) missing!");
        }
    } catch (err) {
        res.status(500).send(err);
    }
});


app.listen(port, () => 
  console.log(`App is listening on port ${port}.`)
);

