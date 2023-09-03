import './style.css'

import * as duration from 'iso8601-duration'
import * as SunCalc from "suncalc"
import moment from "moment"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { load_tides } from './tide_feed'

export function build_chart_data(latlng){
  return load_forecast(latlng).then( result => {
    console.log("Raw Forecast Data",result)
    window.data = result // debug
    return result
  }).then( result =>{
    const days_data = build_days_data(result.forecast,result.day_forecast,latlng,result.tides)
    const hourly_data = build_hourly_data(result.forecast)
    window.days = days_data
    window.hourly = hourly_data
    if(result.tides?.tides){
      window.hourly.tide = result.tides.tides.map(tide => {
        const t = moment(tide.t).toDate()
        return {
          value: Number(tide.v),
          time: t,
          gmtTime: t.toGMTString(),
        }
      })
    }
    return {
      days:days_data,
      hourly:hourly_data,
      station: {
        ...result.station,
        tide_station: { 
          ...result.tides?.station, 
          water_temp: result.tides?.water_temp?.v,
        },
      },
      properties:result.forecast.properties,
      obsv_station: result.obsv_station,
      latlng: latlng,
      raw: result,
    }
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
        expanded_hours: hours,
      })
    }
  })
  return data;
}

function sum_amount(values,start){
  return expand_forecast(values)
        .filter(d => moment(d.time).isSame(start,'day'))
        .reduce((pv,cv) => pv + cv.value.value/cv.expanded_hours, 0)
}

// Load forecast for given location from api.weather.gov
// combine office, grid data, and station information in promises
function load_forecast(latlng){
  const param = {
    method: 'GET',
    mode: 'no-cors',
  }
  return fetch(`https://api.weather.gov/points/${latlng.lat.toFixed(4)},${latlng.lng.toFixed(4)}`).then( response => response.json())
    .then( data => {
      return Promise.all([
        fetch(data.properties.forecastOffice).then( response => response.json() ),
        // TODO this might be a 404, e.g. if you search for Tampa Bay, FL (complains of no marine forecast)
        fetch(data.properties.forecastGridData).then( response => response.json() ),
        fetch(data.properties.observationStations).then( response => response.json() ),
        new Promise( (resolve,reject) => resolve(data)),
        fetch(data.properties.forecast).then( response => response.json() ),
        load_tides(latlng),
      ]).catch(err => { console.error("Failed getting forecast", err)})
    })
    .then( data => {
      return {
        station: data[0],
        forecast: data[1],
        location: data[3],
        day_forecast: data[4],
        obsv_station: data[2].features[0],
        tides: data[5],
      }
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
  ['weather', d => d ],
  ['quantitativePrecipitation', d => d.value ],
  ['snowfallAmount', d => d.value ],
]


// TODO Tides https://api.tidesandcurrents.noaa.gov/api/prod/
function build_days_data(forecast,day_forecast,latlng,tides){
  const days = [];
  const forecast_start = moment.parseZone(forecast.properties.validTimes.split('/')[0]).toDate()
  
  // get local timezone offset
  // All incoming times are in UTC +00, but we want to show local time per
  // user's browser
  const offset = new Date().getTimezoneOffset()

  // build a list of our 8 days, start and end, noon, and sun times
  var j = 0
  for(var i=0;i<8;i++){
    const start = moment(forecast_start).add(i,'days')
    const noon = start.startOf('day').add(12,'hours').toDate()
    
    const day_start = start.startOf('day').toDate()
    const day_weather = day_forecast.properties.periods.filter(f => f.isDaytime && moment(f.startTime).isSame(start,'day'))
    const night_weather = day_forecast.properties.periods.filter(f => !f.isDaytime && moment(f.startTime).isSame(start,'day'))

    const precip_total = {
      rain:sum_amount(forecast.properties.quantitativePrecipitation.values,start),
      snow:sum_amount(forecast.properties.snowfallAmount.values,start),
    }

    const tide_hilo = tides?.tides_hilo ? tides.tides_hilo.filter(tide => moment(tide.t).isSame(start,'day')) : null

    // both in mm
    // snowfallAmount
    // quantitativePrecipitation

    //* 0.393701 * .1 // inches
    const day = {
      start: start.startOf('day').toDate(),
      end: start.endOf('day').toDate(),
      noon: noon,
      icon: (precip_total.snow)?'🌨️':((precip_total.rain)?'🌧️️':'⛅'), // sometimes we don't get the last day icon from the day forecast, so fudge it
      day_weather: day_weather.length>0?day_weather[0]:null,
      night_weather: night_weather.length>0?night_weather[0]:null,
      temp:{
        min:forecast_for_time("minTemperature",day_start,forecast).value.value,
        max:forecast_for_time("maxTemperature",day_start,forecast).value.value,
      },
      sun:SunCalc.getTimes(noon, latlng.lat,latlng.lng),
      precip_total: precip_total,
      tide_hilo: tide_hilo,
    }

    // Determine a simplified icon from the NWS icon url (but don't use their icon)
    const icon_url = (day.day_weather)?day.day_weather.icon:((day.night_weather)?day.night_weather.icon:null)
    if(icon_url){
      const icon_match = /.*land\/day\/([a-z\/]+)/.exec(icon_url)
      if(icon_match){
        let icon = icon_match[1]
        // sometimes they have doubled up icons, e.g. fog/sct
        // we will go for the second one? or should we combine them?
        if(icon.split('/').length > 1){ 
          icon = icon.split('/')[1]
        }
        console.log(day.start,icon_url,icon)
        day.icon = ICON_MAP[icon] || ''
      }
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

// https://api.weather.gov/icons + https://unicode.party/
const ICON_MAP = {
  'rain': '🌧️',
  'rain_showers': '🌧️',
  'sct': '⛅',
  'skc': '☀️',
  'few': '☀️',
  'bkn': '☁️',
  'snow': '🌨️',
  'fog': '🌫️',
  'tsra': '🌩️',
  'hot': '☀️',
  'hurricane': '🌀',
  'blizzard': '🌨️',
  'cold': '🥶',
  'ovc': '☁️',
  // TODO
  'bkn': '❔',
  'dust': '❔',
  'fzra': '❔',
  'haze': '❔',
  'rain_fzra': '❔',
  'rain_showers_hi': '❔',
  'rain_sleet': '❔',
  'rain_snow': '❔',
  'skc': '❔',
  'sleet': '❔',
  'smoke': '❔',
  'snow_fzra': '❔',
  'snow_sleet': '❔',
  'tornado': '❔',
  'tropical_storm': '❔',
  'tsra_hi': '❔',
  'tsra_sct': '❔',
  'wind_bkn': '❔',
  'wind_few': '❔',
  'wind_ovc': '❔',
  'wind_sct': '❔',
  'wind_skc': '❔',
}
