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

server.get ('/location' , (req,res)=>{
  let getData = require('./data/location.json');
  let locationData = new Location (getData);
  res.send(locationData);

});

function Location (getData) {



  this.search_query = 'Lynwood';
  this.formatted_query = getData[0].display_name;
  this.latitude = getData[0].lat;
  this.longitude = getData[0].lon;
}

server.get ('/weather',(req, res) =>{
  let getData =require('./data/weather.json');
  let somData = getData.data;
  let array = [];
  somData.forEach(element => {
    let weatherDay = new Weather (element);
    array.push(weatherDay);
  });

  res.send(array);

});


function Weather (getData) {



  this.forecast = getData.weather.description;
  this.time = getData.datetime;
}

server.get('*',(req,res)=>{
  {
    let errorObj = {
      status: 500,
      responseText: 'Sorry, something  wrong on page again late time'
    };
    res.status(500).send(errorObj);
  }});

server.listen(PORT , ()=>{
  console.log(`listening on port ${PORT}`);
  console.log('ahmad');
});
