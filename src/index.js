import * as duration from "iso8601-duration"
import * as d3 from "d3"
import * as SunCalc from "suncalc"
import { response } from "express"

function init(){
  const el = document.getElementById("app")
  load_forecast().then( result => console.log(result))
}


function load_forecast(){
  return fetch(`https://api.weather.gov/points/${latlng.lat},${latlng.lng}`).then( response => response.json())
    .then( data => {
      return fetch(data.properties.forecastOffice)
    }).then( response => response.json() )
    .catch(err => {
      console.error('Request failed', err)
    })
}

init()