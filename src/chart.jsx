import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import {build_chart_data,browser_location} from './data_feed.js';
import { Day } from './day.jsx'

function useForecastData(){
  const [forecast,setForecast] = useState(null);
  const updateForecast = useCallback( latlng => {
    build_chart_data(latlng).then( result => {
      console.log("Processed Forecast Data",result)
      setForecast(result)
    })
  }, [forecast]);
  return { forecast, updateForecast };
}

export function Chart(props){
  const { forecast, updateForecast} = useForecastData()
  const input_ref = useRef(null)

  const lookup_location = (event) => {
    if(input_ref.current.value.length < 5){
      alert("Must be at last 5 characters long, e.g. a zip code")
    }else{
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${input_ref.current.value}&countrycodes=us&format=jsonv2`
      ).then( response => response.json() ).then( data => {
        if(data.length > 0){
          const latlng = {lat:Number(data[0].lat),lng:Number(data[0].lon)}
          updateForecast(latlng)
        }else{
          alert(`Sorry, no locations found for "${input_ref.current.value}. Forecasts are limited to the USA`)
        }
      })
    }
  }

  const my_location = (event) => {
    input_ref.current.value = ""
    browser_location().then( latlng => {
      return updateForecast(latlng)
    }).catch( error => {
      // TODO Notify user we can't get their proper location
      // and Show them Ocean Beach, San Diego, CA =]
      return updateForecast({lat:32.7499568,lng:-117.2521772})
    })
  }

  useEffect(() => {
    // Initialize with user's location 
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
      days.push(<Day day={forecast.days[i]} hourly={forecast.hourly} first={first_day} last={last_day} />)
    }
  }

  let station_detail = ''
  if(forecast != null){
    station_detail = (
      <div class="station_detail">
        <p>
          elev: {Math.round(forecast.properties.elevation.value * 3.281).toLocaleString()}ft, 
          &nbsp; loc: {Math.abs(forecast.latlng.lat.toFixed(4))}°{(forecast.latlng.lat>0)?"N":"S"},{Math.abs(forecast.latlng.lng).toFixed(4)}°{(forecast.latlng.lng>0)?"E":"W"} 
          &nbsp; id: {forecast.obsv_station.properties.stationIdentifier}  
        </p>
      </div>
    )
  }

  return (
    <>
      <div class="chart">
        <h1>{forecast==null?"Loading":forecast.obsv_station.properties.name}</h1>
        {station_detail}
        <div class="search">
          <input type="text" placeholder="To change location, enter city or zip (USA only)" ref={input_ref} />
          <button onClick={lookup_location}>Go</button>
          <button onClick={my_location}>Use My Location</button>
        </div>
        <div class="days">
          {days}
        </div>
      </div>
      <div id="sources">
        <p>Created by <a href="https://github.com/nikolajbaer">Nikolaj Baer</a>. Weather data from <a href="https://www.weather.gov/documentation/services-web-api#/">api.weather.gov (NWS)</a></p>
        <p>Forecasts are only available for the United States.</p>
      </div>
    </>
  )
}