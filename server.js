/* eslint-disable no-redeclare */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
'use strict';

const express = require('express');

require('dotenv').config();
const superagent = require('superagent');

const server = express();
const PORT = process.env.PORT || 2000;

const cors = require('cors');
server.use(cors());
const pg = require('pg');

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

server.get('/', testHander);
server.get('/location', locationHander);
server.get('/weather', weatherHandler);
server.get('/parks', parkHandler);
server.get('*', errorHander);

function testHander(req, res) {
  res.send('your server work');
}

function locationHander(req, res) {
  // console.log(req.query.cityName);

  let key = process.env.LOCATION_KEY;
  let cityName = req.query.city;
  // console.log(req.query);
  // console.log(cityName);
  let LocalURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json `;

  superagent
    .get(LocalURL) //send request to LocationIQ API
    .then((getData) => {
      console.log('inside superagent');
      let infoData = getData.body;
      const myLocationData = new Location(cityName, infoData);
      let SQL = 'SELECT * FROM locations WHERE search_query=$1';
      let cityValue = [cityName];
      client.query(SQL, cityValue).then((result) => {
        // console.log(result);
        if (result.rowCount) {
          res.send(result.rows[0]);
        } else {
          let search_query = myLocationData.search_query;
          let formatted_query = myLocationData.formatted_query;
          let lat = myLocationData.latitude;
          let lon = myLocationData.longitude;
          SQL =
            'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;';
          let safeValues = [search_query, formatted_query, lat, lon];
          client.query(SQL, safeValues).then((result) => {
            res.send(result.rows[0]);
          });
        }
      });
      // }
      // res.send(locationData);
    })
    .catch((error) => {
      console.log('Error in getting data from LocationIQ server');
      console.error(error);
      res.send(error);
    });
  console.log('after superagent');
}

function weatherHandler(req, res) {
  // let cityName = req.query.search_query;
  let lat = req.query.latitude;
  let lon = req.query.longitude;
  // let cityFormat = req.query.formatted_query;
  let key = process.env.WEATHER_KEY;
  let weaURL = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&days=7&key=${key}`;
  superagent.get(weaURL).then((weatherData) => {
    let weatherArray = weatherData.body.data.map((element) => {
      return new Weather(element);
    });
    res.send(weatherArray);
  });
}

function parkHandler(req, res) {
  let cityName = req.query.search_query;
  let key = process.env.PARK_KEY;
  let parkUPL = `https://developer.nps.gov/api/v1/parks?q=${cityName}&limit=10&api_key=${key}`;
  superagent.get(parkUPL).then((parkData) => {
    // console.log(parkData.body.data);
    let parkArray = parkData.body.data.map((element) => {
      return new Park(element);
    });
    res.send(parkArray);
  });
}

function Location(cityName, getData) {
  this.search_query = cityName;
  this.formatted_query = getData[0].display_name;
  this.latitude = getData[0].lat;
  this.longitude = getData[0].lon;
}

function Weather(getData) {
  this.forecast = getData.weather.description;
  this.time = getData.datetime;
}

function Park(parksDataForEl) {
  this.name = parksDataForEl.fullName;
  // let add = Object.keys(parksData.addresses);
  this.address = parksDataForEl.addresses[0].line1;
  this.fee = parksDataForEl.fees;
  this.description = parksDataForEl.description;
  this.url = parksDataForEl.url;
}

function errorHander(req, res) {
  {
    let errorObj = {
      status: 500,
      responseText: 'Sorry, something  wrong on page again late time',
    };
    res.status(500).send(errorObj);
  }
}

// server.listen(PORT, () => {
//   console.log(`listening on port ${PORT}`);
//   console.log('ahmad');
// });

client.connect().then(() => {
  server.listen(PORT, () => console.log(`listening on ${PORT}`));
});
