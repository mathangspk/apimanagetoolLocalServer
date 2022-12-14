const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv/config');
const orders = require('./routes/api/orders')
const fastReports = require('./routes/api/fastReports')
const cchtts = require('./routes/api/cchtts')
const cgsats = require('./routes/api/cgsats')
const bbdgkts = require('./routes/api/bbdgkts')
const bptcs = require('./routes/api/bptcs')
const userRoute = require('./routes/user');
const tool = require('./routes/api/tools');
const customer = require('./routes/api/customer');
const upload = require('./routes/api/upload');
const post = require('./routes/api/post');


const path = require('path');
const methodOverride = require('method-override');

const app = express();

//@use cors 
app.use(cors(
  //   {
  //   'allowedHeaders': ['sessionId', 'Content-Type'],
  //   'exposedHeaders': ['sessionId'],
  //   'origin': '*',
  //   'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   'preflightContinue': false
  // }
));

//body parser 
app.use(bodyParser.json());

app.use(methodOverride('_method'));

//DB config
const db = require('./config/keys').mongoURI;


mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
  .then(() => {
    console.log('MogoDB Connected!')
  })
  .catch((err) => console.log(err))

//use route
app.use('/api/orders', orders);
app.use('/api/fastReports', fastReports);
app.use('/api/cchtts', cchtts);
app.use('/api/cgsats', cgsats);
app.use('/api/bbdgkts', bbdgkts);
app.use('/api/bptcs', bptcs);
app.use('/users', userRoute);
app.use('/api/tools', tool);
app.use('/api/customers', customer);
app.use('/api/upload', upload);
app.use('/api/blogs', post);


// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const port = process.env.PORT || 4001
app.listen(port, () => {
  console.log(`server running.... at ${port}`)
})

console.log('run')