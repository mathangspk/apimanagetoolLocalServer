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

//var folderId = '1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh'
var obj = { folder: [] }
//var folderIdUpload = '1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh'
console.log('quet chuong trinh')

//https://drive.google.com/drive/folders/1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh?usp=sharing
// const upload = multer({
//   storage: GoogleDriveStorage({
//     drive: drive,
//     parents: folderIdUpload,
//     fileName: function (req, file, cb) {
//       let filename = `test-${file.originalname}`;
//       cb(null, filename);
//     }
//   }),
//   limits: {
//     files: 5, // allow up to 5 files per request,
//     fileSize: 10 * 1024 * 1024 // 5 MB (max file size)
//   },
//   fileFilter: (req, file, cb) => {
//     // allow images only
//     if (!file.originalname.match(/\.(jpg|jpeg|png|gif|JPG|PNG|JPEG|GIF)$/)) {
//       return cb(new Error('Only image are allowed.'), false);
//     }
//     cb(null, true);
//   }
// });
const upload = multer();
const uploadFile = async (fileObject, folderId, name) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);
  console.log('uploadFile', folderId)
  var fileMetadata = {
    'name': name,
    parents: [folderId]
  };
  const { data } = await google.drive({ version: "v3", auth: oauth2Client }).files.create({
    resource: fileMetadata,
    media: {
      mimeType: fileObject.mimeType,
      body: bufferStream,
    },
    // requestBody: {
    //   name: fileObject.originalname,
    //   parents: ["1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh"],
    //   //parents: folderId
    // },
    fields: "id,name",
  });
  console.log("folder id, ", folderId);
  console.log(`Uploaded file ${data.name} ${data.id}`);
};
function check(folder, nameFolder) {
  for (var i = 0; i < folder.length; i++) {
    console.log(folder[i].name)
    if (folder[i].name === nameFolder) {
      return folder[i].id;
    }
  } return false;
}

function findIdDelete(obj) {
  for (var i = 0; i < obj.folder.length; i++) {
    var today = new Date()
    var priorDate = new Date().setDate(today.getDate() - 7)
    //console.log(moment(priorDate).format('YYYY-MM-DD'))
    priorDate = moment(priorDate).format('YYYY-MM-DD');
    if (obj.folder[i].name === priorDate) {
      let idDelete = obj.folder[i].id;
      obj.folder.splice(0, 1);
      var json = JSON.stringify(obj)
      fs.writeFile('data.json', json, 'utf8', () => {
        console.log('file write')
      })
      return idDelete;
    }
  } return false;
}
async function deleteFolder(fileId) {
  try {
    const response = await drive.files.delete({
      fileId,
    });
    console.log(response.data, response.status)

  } catch (error) {
    console.log(error.message)
  }
}
async function uploadMultiFileInFolder(files, folderId) {
  console.log('Starting upload file to Folder: ', folderId)
  console.log("gggg", files)
  for (var i in files) {
    fileInfo[i] = {
      name: files[i],
      pathName: pathName + '/' + files[i],
      mimeType: mime.lookup(files[i]),
    }
    await createFileInFolder(folderId, fileInfo[i].name, fileInfo[i].mimeType, fileInfo[i].pathName)
  }
}


async function createFolderInFolder(files, folderId, name, UploadFile) {
  try {
    var fileMetadata = {
      'name': name,
      'mimeType': 'application/vnd.google-apps.folder',
      parents: [folderId]
    };
    await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    }, function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        folderIdUpload = file.data.id;
        console.log('Create Folder successfully');
        console.log('Folder Id: ', file.data.id);

        obj.folder.push({ id: file.data.id, name: name, time: moment() })
        var json = JSON.stringify(obj)
        fs.writeFile('data.json', json, 'utf8', () => {
          console.log('Save data to data.json complete!')
        })
        if (UploadFile) {
          for (let f = 0; f < files.length; f += 1) {
            uploadFile(files[f], file.data.id, files[f].originalname);
          }
        }

      }
    });

  } catch (error) {
    console.log(error)
  }
}


async function checkExitsFolder(files, nameFolder) {
  let parentFolder = '1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh'; // Name: PicInMana
  fs.readFile('data.json', 'utf8', (err, data) => {
    if (err) {
      console.log(err)
    } else if (data) {
      console.log('Exist data in Json File')
      obj = JSON.parse(data);
      let folder = obj.folder;
      let idNameDelete = findIdDelete(obj)
      if (!idNameDelete) {
        console.log("Don't need remove any folder")
      } else {
        console.log("FolderId was deleted: ", idNameDelete)
        deleteFolder(idNameDelete);
      }
      let existName = (check(folder, nameFolder))
      if (!existName) {
        console.log('Not exist folder Today in JSON data')
        createFolderInFolder(files, parentFolder, nameFolder, true);
      } else {
        console.log('Exist folder Today in JSON data')
        folderIdUpload = existName;
        console.log(existName)
        console.log(files[0].originalname)
        //uploadFile(files[0], existName, 'fff');
        for (let f = 0; f < files.length; f += 1) {
          uploadFile(files[f], existName, files[f].originalname);
        }
      }
    } else {
      console.log("Don't have any data in data.json file")
      //tao folder moi && upload file
      createFolderInFolder(files, parentFolder, nameFolder, true);

    }
  })
}

async function createFileInFolder(folderId, name, mimeType, path) {
  try {
    var folderId = folderId;
    var fileMetadata = {
      'name': name,
      parents: [folderId]
    };
    var media = {
      mimeType,
      body: fs.createReadStream(path)
    };
    await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name'
    }, function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        console.log('Upload file: ', file.data, 'complete')
      }
    });
  } catch (error) {
    console.log(error)
  }
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
    const { body, files } = req;

    checkExitsFolder(photos, String(moment().format('YYYY-MM-DD')))
    console.log(photos)
    //uploadMultiFileInFolder(photos, '1DhaSC-IrpGvW-tmU0l2_H2eb80XyOCMh')
    // // check if photos are available
    // if (!photos) {
    //   res.status(400).send({
    //     status: false,
    //     data: 'No photo is selected.'
    //   });
    // } else {
    //   let data = [];
    //   // iterate over all photos
    //   photos.map(p => data.push({
    //     filename: p.filename,
    //     name: p.originalname,
    //     mimetype: p.mimetype,
    //     size: p.size
    //   }));

    // send response
    res.send({
      status: true,
      message: 'Photos are uploaded.',
      data: "data"
    });
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
  gfs.remove({ filename: req.params.filename, root: 'uploads' }, (err) => {
    if (err) return res.status(500).json({ success: false })
    return res.json({ success: true });
  })
});


module.exports = router;