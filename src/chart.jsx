import { useState, useCallback, useEffect } from 'preact/hooks';
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

  // TODO allow user to change location
  useEffect(() => {
    browser_location().then( latlng => {
      return updateForecast(latlng)
    }).catch( error => {
      // TODO Notify user we can't get their proper location
      // and Show them Ocean Beach, San Diego, CA =]
      return updateForecast({lat:32.7499568,lng:-117.2521772})
    })
  }, []);

  let days = []
  if(forecast){
    for(var i=0;i<8;i++) {
      days.push(<Day day={forecast.days[i]} hourly={forecast.hourly} />)
    }
  }

  return (
    <>
      <div class="chart">
        <h2>{forecast==null?"Loading":forecast.station.name}</h2>
        <div class="days">
          {days}
        </div>
      </div>
    </>
  )
}