import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import {build_chart_data,browser_location} from './data_feed.js';
import { load_tides } from './tide_feed.js';
import { Day } from './day.jsx'
import { Map } from './map.jsx'

function useForecastData(){
  const [forecast,setForecast] = useState(null);
  const updateForecast = useCallback( latlng => {
    return build_chart_data(latlng).then( result => {
      console.log("Processed Forecast Data",result)
      setForecast(result)
    })
  }, [forecast]);
  return { forecast, updateForecast };
}

export function Chart(props){
  const { forecast, updateForecast} = useForecastData()
  const input_ref = useRef(null)
  const [map_visible,setMapVisible] = useState(false)

  const lookup_location = (event) => {
    if(input_ref.current.value.length < 5){
      alert("Must be at last 5 characters long, e.g. a zip code")
    }else{
      input_ref.current.disabled = true
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${input_ref.current.value}&countrycodes=us&format=jsonv2`
      ).then( response => response.json() ).then( data => {
        if(data.length > 0){
          const latlng = {lat:Number(data[0].lat),lng:Number(data[0].lon)}
          
          update_browser_location(latlng)

          updateForecast(latlng).then((result) => {
            input_ref.current.disabled = false
          })
        }else{
          alert(`Sorry, no locations found for "${input_ref.current.value}. Forecasts are limited to the USA`)
          input_ref.current.disabled = false
        }
      }).catch( error => { 
        console.error("Error getting location",error)
        input_ref.current.disabled = false
      })
    }
  }

  const lookup_keypress = (event) => {
    if(event.key == 'Enter'){
      lookup_location()
    }
  }

  const my_location = (event) => {
    input_ref.current.value = ""
    browser_location().then( latlng => {
      update_browser_location(latlng)
      return updateForecast(latlng)
    }).catch( error => {
      // TODO Notify user we can't get their proper location
      // and Show them Ocean Beach, San Diego, CA =]
      return updateForecast({lat:32.7499568,lng:-117.2521772})
    })
  }

  const show_map = (event) => {
    setMapVisible(!map_visible)
  }

  useEffect(() => {
    // If we have a lat= lng= in the url, let's prime it with that
    const url = new URL(window.location)
    if(url.searchParams.get('lat') && url.searchParams.get('lng')){
      const latlng_data = {
        lat:Number(url.searchParams.get('lat')),
        lng:Number(url.searchParams.get('lng'))
      }
      if(!Number.isNaN(latlng_data.lat) && !Number.isNaN(latlng_data.lng)){
        updateForecast(latlng_data)
        return
      }
    }

    // Otherwise let's try to get the user's location
    my_location(null)
  }, []);

  let days = []
  const today = new Date()
  if(forecast){
    for(var i=0;i<8;i++) {
      // Data might include prior day, but we don't want to show historical forecast
      if(forecast.days[i].start.getDate() < today.getDate() && forecast.days[i].start.getMonth() == today.getMonth()){
        continue
      }
      const first_day = days.length == 0
      const last_day = i == 7
      days.push(<Day day={forecast.days[i]} hourly={forecast.hourly} first={first_day} last={last_day} station={forecast.station} />)
    }
  }

  let station_detail = ''
  if(forecast != null){
    station_detail = (
      <div class="station_detail">
        <p>
          Nearest Observation Station: {forecast.obsv_station.properties.name}<br/>
          &nbsp; elev: {Math.round(forecast.obsv_station.properties.elevation.value * 3.281).toLocaleString()}ft, 
          &nbsp; loc: {Math.abs(forecast.latlng.lat.toFixed(4))}°{(forecast.latlng.lat>0)?"N":"S"},{Math.abs(forecast.latlng.lng).toFixed(4)}°{(forecast.latlng.lng>0)?"E":"W"}
          &nbsp; id: {forecast.obsv_station.properties.stationIdentifier}  
        </p>
      </div>
    )
  }

  let map = ''
  if(map_visible){
    // send raw data since it has a lot of geojson in it
    map = <Map data={forecast} center={forecast.latlng} />
  }

  return (
    <>
      <div class="chart">
        <h1>{forecast==null?"Loading":forecast.station.name}</h1>
        {station_detail}
        <div class="search">
          <input type="text" placeholder="To change location, enter city or zip (USA only)" ref={input_ref} onKeyPress={lookup_keypress} />
          <button onClick={lookup_location}>Go</button>
          <button onClick={my_location}>Use My Location</button>
          <button onClick={show_map}>{map_visible?"Hide Map":"Show Map"}</button>
        </div>
        {map}
        <div class="days">
          {days}
        </div>
      </div>
      <div id="sources">
        <p>Created by <a href="https://github.com/nikolajbaer">Nikolaj Baer</a> 
          (<a href="https://github.com/nikolajbaer/quick_weather">src</a>). 
          Weather data from <a href="https://www.weather.gov/documentation/services-web-api#/">api.weather.gov (NWS)</a>
          Tide data from <a href="https://api.tidesandcurrents.noaa.gov/api/prod/">api.tidesandcurrents.noaa.gov (NWS)</a> 
        </p>
        <p>Forecasts are only available for the United States.</p>
      </div>
    </>
  )
}

function update_browser_location(latlng){
  const url = new URL(window.location)
  url.searchParams.set('lat',latlng.lat.toFixed(5))
  url.searchParams.set('lng',latlng.lng.toFixed(5))
  window.history.pushState({}, '', url)
}