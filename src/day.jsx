import moment from 'moment';

export function Day(props){
  const hourly = {}
  Object.keys(props.hourly).forEach( k => {
    hourly[k] = props.hourly[k].filter( 
      m => m.time >= props.day.start && m.time <= props.day.end 
    )
  })

  return (
    <>
      <div class="day">
        <Summary day={props.day}/>
        <TempChart day={props.day} hourly={hourly} />
      </div>
    </>
  ) 
}


function Summary(props){
  const title = moment(props.day.start).format(DAY_FMT)
  const weather = determine_weather(props.day)
  const precip_total = props.day.precip_total.toFixed(2) + ' in'
  const precip_type = (props.day.precip_total>0?'💧':'') // TODO snow

  return (
    <>
      <div class="summary">
        <h3>{title}</h3>
        <p class="weather">{weather.i}</p>
        <p class="temp">
          <span class="maxtemp">{formatTemp(props.day.temp.max)}</span> |&nbsp;
          <span class="mintemp">{formatTemp(props.day.temp.min)}</span>
        </p>
        <p class="precip">{precip_total} {precip_type}</p>
        <ul>
          <li>Sunrise: {moment(props.day.sun.sunrise).format(HOUR_FMT)}</li>
          <li>Sunset: {moment(props.day.sun.sunset).format(HOUR_FMT)}</li>
        </ul> 
      </div>
    </>
  )
}


function TempChart(props){
  // TODO make a y-value mapping
  const temp = hourly_path(hourly.temperature,props.day.start, v => v)
  const dewpoint = hourly_path(hourly.dewpoint,props.day.start, v => v)
  return (
    <>
      <svg viewBox="0 0 240 300" >
        <DawnDuskUnderlay day={props.day} />
        <path d={temp} stroke="red" fill="none" />
        <path d={dewpoint} stroke="green" fill="none" />
      </svg>
    </>
  )
}

function DawnDuskUnderlay(props){
  const day = props.day
  const dawn = xval(day.sun.sunrise,day.start)
  const sunset = xval(day.sun.sunset,day.start) 
  const dusk = 240-sunset

  return (
    <>
      <g>
        <rect fill="#DDD" width={dawn} height="300" />
        <rect fill="#DDD" x={sunset} width={dusk} height="300" />
        <line x1="240" y1="0" x2="240" y2="300" stroke="#aaa" />
      </g>
    </>
  )

}

const HOUR_FMT = 'h:mmA'
const DAY_FMT = 'ddd, MMM Do'

function formatTemp(C){ return (Math.round((C*(9/5)) + 32) + "°F") }

function determine_weather(weather){
  if(weather.precip_total > 0){ return {n:"Rainy",i:"☔"} }  // todo drizzle, rain, snow
  if(weather.skyCover > 50){ return {n:"Cloudy",i:"☁️"}; } 
  if(weather.skyCover > 10){ return {n:"Partly Cloudy",i:"⛅"}; }
  return {n:"Sunny",i:"☀️"};
}

// the x position of this date relative to start
function xval(date,start){
  // time is in ms
  return (date.getTime() - start.getTime())/1000/3600 * 10
}

function hourly_path(values,start,yval){
  return 'M'  + values.map( m => {
    return `${xval(m.time,start)} ${yval(m.value)}`
  }).join('L ')
}
