const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verify = require('../verifyToken');
const db = require('../../config/keys').mongoURI;
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Gird = require('gridfs-stream');
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const stream = require('stream')
var GoogleDriveStorage = require('multer-google-drive')
var { google } = require('googleapis')
const CLIENT_ID = "1053431940611-he0t7ad89i0edv52qdhj549rfqao92tn.apps.googleusercontent.com"
const CLIENT_SECRET = "jBMWRinXEpdJZfDZmHG73FLs"
const REDIRECT_URI = "https://developers.google.com/oauthplayground"
const REFRESH_TOKEN = "1//04zJG01M7dZrKCgYIARAAGAQSNwF-L9Ir5FumS0D58f4TOgJMle1cshuTW6ErdnpMZScoRn4S1nxlb6U-s7WEmIBL03Gzt_oS_Uw"

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })
const conn = mongoose.createConnection(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
//init gfs
let gfs;

conn.once('open', () => {
  gfs = Gird(conn.db, mongoose.mongo)
  gfs.collection('uploads');
})

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
})
//create storage engine

var obj = { folder: [] }

const upload = multer();

async function setFilePublic(fileId) {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })
    const getUrl = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink'
    })
    return getUrl.data;
  } catch (error) {
    console.log(error)
  }
}
async function uploadFile(fileObject, folderId, name) {
  try {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    console.log('uploadFile', folderId)
    var fileMetadata = {
      'name': name,
      parents: [folderId]
    };
    const { data } = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: fileObject.mimeType,
        body: bufferStream,
      },
      fields: "id,name",
    });
    const getUrl = await setFilePublic(data.id)
    //console.log(getUrl)
    return data.id
    //return getUrl
    console.log("folder id, ", folderId);
    console.log(`Uploaded file ${data.name} ${data.id}`);
  } catch (error) {
    console.log(error)
  }
};
async function deleteFile(fileId) {
  try {
    const deletePic = await drive.files.delete({
      fileId: fileId
    })
    console.log(deletePic.data, deletePic.status)
  } catch (error) {
    console.log(error)
  }
}
async function createFolder(drive, folderName, parentFolderId) {
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };
  const res = await drive.files.create({
    resource: folderMetadata,
    fields: 'id',
  });
  return res.data.id;
};


async function checkExitsFolder(folderName, parentFolderId, fileUploads) {
  // Sử dụng API để tìm kiếm các thư mục con của thư mục cha có tên là folderName
  drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false and name='" + folderName + "' and '" + parentFolderId + "' in parents",
    fields: 'nextPageToken, files(id, name)',
  }, async (err, res) => {
    if (err) return console.log('Lỗi:', err);
    const folders = res.data.files;
    let data = [];
    if (folders.length === 0) {

      const folderId = await createFolder(drive, folderName, '1EiRRncOVhwHl2TA33umq9YqPe6qSrbLs');
      var dataPromise = fileUploads.map(async fileUpload => {
        const id = await uploadFile(fileUpload, folderId, fileUpload.originalname) //upload to folder PicINTool
        //console.log("show id ", id)
        data.push({
          idFile: id
        })
        console.log(data)
        return data
      })
      data = await Promise.all(dataPromise);
      console.log(data)
      return data
    } else {
      // Nếu đã có thư mục tồn tại, trả về ID của thư mục đó
      const folderId = folders[0].id;
      console.log(`Thư mục "${folderName}" đã tồn tại trong thư mục cha với ID là "${folderId}".`);
      var dataPromise = fileUploads.map(async fileUpload => {
        const id = await uploadFile(fileUpload, folderId, fileUpload.originalname) //upload to folder PicINTool
        //console.log("show id ", id)
        data.push({
          idFile: id
        })
        console.log(data)
        return data
      })
      data = await Promise.all(dataPromise);
      console.log(data)
      return data

    }
  });
}
//@route Post upload
router.post('/', verify, upload.single('photo'), async (req, res) => {
  try {
    //checkExitsFolder(String(moment().format('YYYY-MM-DD')))
    const photo = req.file;

    if (!photo) {
      res.status(400).send({
        status: false,
        data: 'No photo is selected'
      })
    }
    else {
      res.json({ file: req.file })
      let data = [];

      // iterate over all photos
      photo.map(p => data.push({
        name: p.originalname,
        mimetype: p.mimetype,
        size: p.size
      }));
      // send response
      res.send({
        status: true,
        message: 'Photos are uploaded.',
        data: data
      })
    }
  }
  catch (err) {
    res.status(500).json(err.details[0].message)
  }

})


//@route POST many image
//router.post('/upload-photos', verify, upload.array('photos', 8), async (req, res) => {
router.post('/upload-photos', verify, upload.any(), async (req, res) => {
  try {
    const photos = req.files;
    console.log(photos)
    const { body, files } = req;
    let data = [];
    //const status = await checkExitsFolder(photos, String(moment().format('YYYY-MM-DD')))
    var dataPromise = photos.map(async photo => {
      const id = await uploadFile(photo, '1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh', photo.originalname) //upload to folder PicINTool
      //console.log("show id ", id)
      data.push({
        idImage: id
      })
      console.log(data)
      return data
    })
    data = await Promise.all(dataPromise);
    console.log(data)
    res.send({
      status: true,
      message: 'Photos are uploaded.',
      data: data[0]
    })
  }
  catch (err) {
    res.status(500).send(err);
    console.log(err)
  }
});
router.post('/upload-files', verify, upload.any(), async (req, res) => {
  try {
    //console.log(req)
    const fileUploads = req.files;
    //console.log(fileUploads)


    const folderName = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const parentId = '1EiRRncOVhwHl2TA33umq9YqPe6qSrbLs';
    const data = await checkExitsFolder(folderName, parentId, fileUploads)
    res.send({
      status: true,
      message: 'Files are uploaded.',
      data: data[0]
    })
  }
  catch (err) {
    res.status(500).send(err);
    console.log(err)
  }
});

//@route GET / files
//display all files in JSON

router.get('/images', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }
    //File exist
    return res.json(files);
  })
})

//@route GET /files/:filename
// display single file
router.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check if files
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exist'
      });
    }
    //File exist
    return res.json(file);
  })
});

//@route GET /image/:filename
// display single file
router.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check if files
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exist'
      });
    }
    //Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
      var readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(400).json({
        err: 'Not an image'
      })
    }
  })
});

//@route delete 
// files/del/:filename
// Delete chunks from the db
router.delete("/image/:filename", verify, async (req, res) => {
  let fileId = req.params.filename
  console.log(req.params.filename)
  deleteFile(fileId)
  res.json({ success: true });
});
module.exports = router;