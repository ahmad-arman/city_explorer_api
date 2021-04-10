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
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

server.get('/', testHander);
server.get('/location', locationHander);
server.get('/weather', weatherHandler);
server.get('/parks', parkHandler);
server.get('/movies', moviesHander);
server.get('/yelp', yelpHander);
server.get('*', errorHander);

function testHander(req, res) {
  res.send('your server work');
}

function locationHander(req, res) {
  // console.log(req.query.cityName);

  let key = process.env.LOCATION_KEY;
  let cityName = req.query.city;

  // console.log(cityName);

  let LocationURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json `;

  superagent
    .get(LocationURL) //send request to get the LocationIQ API and get data

    .then((getData) => {
      console.log('inside superagent');

      let infoData = getData.body;

      const myLocationData = new Location(cityName, infoData);

      let SQL = 'SELECT * FROM locations WHERE search_query=$1';
      let cityValue = [cityName];
      console.log('city Name : ', cityName);

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
    })
    .catch((error) => {
      console.log('Error in the data from Location server');
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

function moviesHander(req, res) {
  let key = process.env.MOVIE_KEY;
  // let movieURL=`https://api.themoviedb.org/3/movie/550?api_key=${key}`;
  let movieURL = `https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`;

  superagent
    .get(movieURL)
    .then((movieData) => {
      // console.log(movieData.body.results , 'title');

      let arr = movieData.body.results.map((element) => {
        // console.log(element);
        return new Movie(element);
      });

      res.send(arr);
      // console.log(arr);
    })
    .catch((error) => {
      console.error('errorrrrrr');
      res.send(error);
    });
}

// url request =  http://localhost:2000/yelp?search_query=seattle&formatted_query=Seattle%2C%20King%20County%2C%20Washington%2C%20USA&latitude=47.60383210000000&longitude=-122.33006240000000&page=1
let page = 1;
function yelpHander(req, res) {
  let cityName = req.query.search_query;
  // function getYelp(city, page) {
  let key = process.env.YELP_KEY;
  const numPerPage = 5;

  // let start = (page - 1) * numPerPage + 1;

  // console.log(start , 'starrrrrrrrrrrrrrrrrrrrrrrrrrrrrt');
  let yelpURL = `https://api.yelp.com/v3/businesses/search?term=restaurants&location=${cityName}&limit=${numPerPage}&offset=${page}`;

  // console.log(start , 'after url ');

  // const numPerPage= 5;
  // let page = req.query.page;

  superagent
    .get(yelpURL)
    .set('Authorization', `Bearer ${key}`)
    .then((getData) => {
      let newArray = getData.body.businesses;
      // console.log(newArray);
      // console.log(getData.body);
      newArray.map((element) => {
        // console.log(element, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        return new Yelp(element);
      });
      res.send(newArray);
      // console.log(newArray);
    });
  // }
  // getYelp(cityName, page);
  page = page+5;
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

function Movie(getData) {
  this.title = getData.title;
  this.overview = getData.overview;
  this.average_votes = getData.vote_average;
  this.total_votes = getData.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${getData.backdrop_path}`;
  this.popularity = getData.popularity;
  this.released_on = getData.release_date;
}

function Yelp(getData) {
  this.name = getData.name;
  this.image_url = getData.image_url;
  this.price = getData.price;
  this.url = getData.url;
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

client.connect().then(() => {
  server.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
});

// server.listen(PORT, () => {
//   console.log(`listening on port ${PORT}`);
//   console.log('ahmad');
// });
