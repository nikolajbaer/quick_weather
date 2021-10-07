import './style.css'

import * as duration from 'iso8601-duration'
import * as SunCalc from "suncalc"
import moment from "moment"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"

export function build_chart_data(latlng){
  return load_forecast(latlng).then( result => {
    console.log(result)
    window.data = result // debug
    return result
  }).then( result =>{
    const days_data = build_days_data(result.forecast,latlng)
    const hourly_data = build_hourly_data(result.forecast)
    return {days:days_data,hourly:hourly_data,station:result.station}
  })
}

export function browser_location(){
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(result => {
      resolve({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
      })
    }, reject, {  
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    })
  })
}

// api.weather.gov delivers forecasts with rows spanning multiple hours using
// iso8601, so this is a 
// utility to expand the iso date timespan formats, e.g. PT6H, to 6 hourly values
// note maybe we need to pass in the extent we want as well
function expand_forecast(values,f){
  const data = []
  values.forEach( d => {
    const values = d.validTime.split('/');
    const t = Date.parse(values[0]);
    const td = duration.parse(d.validTime)
    const hours = td.hours + (td.days*24)
    for(var i=0;i<hours;i++){
      const t1 = new Date(t + 60*60*1000*i)
      data.push({  
        gmtTime: t1.toGMTString(), 
        time: t1,
        value: f!=null?f(d):d,
      })
    }
  })
  return data;
}

// Load forecast for given location from api.weather.gov
// combine office, grid data, and station information in promises
function load_forecast(latlng){
  return fetch(`https://api.weather.gov/points/${latlng.lat},${latlng.lng}`).then( response => response.json())
    .then( data => {
      return Promise.all([
        fetch(data.properties.forecastOffice).then( response => response.json() ),
        fetch(data.properties.forecastGridData).then( response => response.json() ),
        new Promise( (resolve,reject) => resolve(data)),
      ])
    })
    .then( data => {
      return {station:data[0],forecast:data[1],location:data[2]}
    })
    .catch(err => {
      console.error('Request failed', err)
    })
}

// declare our metrics that we want to show, and conversions where
// applicable
const metrics = [
  ['temperature', d => d.value * 9/5 + 32],
  ['dewpoint', d => d.value * 9/5 + 32],
  ['relativeHumidity', d => d.value],
  ['probabilityOfPrecipitation', d => d.value],
  ['skyCover', d => d.value],
  ['windSpeed', d => d.value],
  ['windDirection', d => d.value],
  ['pressure', d => d.value],
]


// TODO Tides https://api.tidesandcurrents.noaa.gov/api/prod/
function build_days_data(forecast,latlng){
  const days = [];
  const forecast_start = moment.parseZone(forecast.properties.validTimes.split('/')[0]).toDate()
  
  // get local timezone offset
  // All incoming times are in UTC +00, but we want to show local time per
  // user's browser
  const offset = new Date().getTimezoneOffset()
  console.log("Starts at",forecast_start)

  // build a list of our 8 days, start and end, noon, and sun times
  var j = 0
  for(var i=0;i<8;i++){
    const start = moment(forecast_start).add(i,'days')
    const noon = start.startOf('day').add(12,'hours').toDate()
    
    const day_start = start.startOf('day').toDate()
    const inclement = forecast_for_time("weather",noon,forecast)
    const precip_total = forecast_for_time("quantitativePrecipitation",noon,forecast).value.value * 0.393701 * .1 // inches
    const skyCover = forecast_for_time("skyCover",noon,forecast).value.value

    
    const day = {
      start: start.startOf('day').toDate(),
      end: start.endOf('day').toDate(),
      noon: noon,
      inclement: inclement,
      skyCover: skyCover,
      temp:{
        min:forecast_for_time("minTemperature",day_start,forecast).value.value,
        max:forecast_for_time("maxTemperature",day_start,forecast).value.value,
      },
      sun:SunCalc.getTimes(noon, latlng.lat,latlng.lng),
      precip_total: precip_total,
    }
    days.push(day)
  }
  return days
}

function forecast_for_time(metric,d,forecast){
  const values = expand_forecast(forecast.properties[metric].values)
  const matching = values.filter(v => v.time >= d)
  if(matching.length ==0){ return values[0] }
  return matching[0]
}

function build_hourly_data(forecast){
  const pt_regex = /\d+/g
  const data = {}
  metrics.forEach( metric_pak => {
    data[metric_pak[0]] = expand_forecast( forecast.properties[metric_pak[0]].values, metric_pak[1] )
  })
  return data;
}

export function build_map(latlng,data){
  let map = L.map(document.getElementById("map")).setView([latlng.lat,latlng.lng], 14);
  let osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    maxZoom: 19,
	    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  L.marker([latlng.lat,latlng.lng]).addTo(map)
    .bindPopup(data.station.name);
  L.geoJSON([data.forecast], {
		style: function (feature) {
			return feature.properties && feature.properties.style;
		},
    pointToLayer: function (feature, latlng) {
			return L.circleMarker(latlng, {
				radius: 8,
				fillColor: "#ff7800",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 0.8
			});
		}
	}).addTo(map);
}

export function init_chart_data(){
  browser_location().then( result => {
    const latlng = {
      lat: result.coords.latitude,
      lng: result.coords.longitude,
    }
    return build_chart_data(latlng)
  }).catch( error => {
    console.error(error)
    return build_chart_data({lat:32.7499568,lng:-117.2521772})
  })
}
