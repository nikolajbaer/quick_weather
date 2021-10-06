import './style.css'

import * as duration from "iso8601-duration"
import * as d3 from "d3"
import * as SunCalc from "suncalc"
// moment

function init(){
  const el = document.getElementById("app")
  const latlng = {lat:32.7499568,lng:-117.2521772}
  load_forecast(latlng).then( result => {
    console.log(result)
    return result
  }).then( result =>{
    el.innerHTML = `
      <h1>Hello World!</h1>
      ${result.name}
    `
  })
}

function browseR_location(){
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(resolve, reject, {  
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  })
}


function load_forecast(latlng){
  return fetch(`https://api.weather.gov/points/${latlng.lat},${latlng.lng}`).then( response => response.json())
    .then( data => {
      return fetch(data.properties.forecastOffice)
    }).then( response => response.json() )
    .catch(err => {
      console.error('Request failed', err)
    })
}

init()
