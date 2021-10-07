import { useState, useCallback, useEffect } from 'preact/hooks';
import {build_chart_data,browser_location} from './data_feed.js';

function useForecastData(){
  const [forecast,setForecast] = useState(null);
  const updateForecast = useCallback( latlng => {
    build_chart_data(latlng).then( result => {
      setForecast(result)
    })
  }, [forecast]);
  return { forecast, updateForecast };
}

export function Chart(props){
  const {forecast, updateForecast} = useForecastData()

  useEffect(() => {
    browser_location().then( latlng => {
      return updateForecast(latlng)
    }).catch( error => {
      // Notify user we can't get their proper location
      // and Show them OB
      return updateForecast({lat:32.7499568,lng:-117.2521772})
    })
    return () => {};
  }, []);

  return (
    <>
      <div class="chart">
        <h2>{forecast==null?"Loading":forecast.station.name}</h2>
      </div>
    </>
  )
}