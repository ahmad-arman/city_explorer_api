'use strict';

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const server =express();
const PORT = process.env.PORT || 2000 ;

server.use(cors());
server.get ('/' , (req, res)=>{
  res.send('your server work');
});

// server.get ('/location' , (req,res)=>{
//   let getData = require('./data/location.json');

// });

// function Location (getData) {
//     this.
// }


server.listen(PORT , ()=>{
  console.log(`listening on port ${PORT}`);
  console.log('ahmad');
});
