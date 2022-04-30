const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const IPFS = require('ipfs-core');
const _ = require('lodash');
const CID = require('multiformats/cid');
const app = express();
const toBuffer = require('it-to-buffer');

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
let ipfs;

app.post('/storeFile', async (req, res) => {
    try {

        if (ipfs === undefined) {
            ipfs = await IPFS.create();
        }

        if(!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } 
        else {
            let file = req.files.file;
            let id = req.query.id;
            
            await ipfs.files.mkdir('/' + id)
                .catch(e => {
                    res.send({
                        status: false,
                        message: 'This id already exists!'      // create unique directory
                    })
                });        

            await ipfs.files.write('/' + file.name, file.data).catch(e => console.log(e));     // add file to IPFS
            
            await ipfs.files.mv('/' + file.name, '/' + id);     // move file to new folder
            
            const result = await ipfs.files.stat('/' + id + '/' + file.name);
            
            ipfs.stop();

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


app.use('/getFile', async (req, res) => {
    try {

        if (req.query.path !== undefined) {
            
            if (ipfs === undefined) {
                ipfs = await IPFS.create();
            }
            
            const path = req.query.path;
            console.log(path);

            const result = await ipfs.files.stat('/' + id + '/' + file.name);
            console.log(result);

            const bufferedContents = await toBuffer(
                ipfs.files.read(path)
            );
            
            ipfs.stop();
            res.send({
                content: bufferedContents.toString()
            });
            
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

