import { useRef,useState } from 'preact/hooks'
import moment from 'moment';

export function Day(props){
  const [ cursor, setCursor ] = useState(null)

  const t = new Date()
  const current = (t > props.day.end || t < props.day.start)?null:xval(new Date(),props.day.start)

  const day_div = useRef(null)
  const hourly = {}
  Object.keys(props.hourly).forEach( k => {
    hourly[k] = props.hourly[k].filter( 
      m => m.time >= props.day.start && m.time <= props.day.end 
    )
  })

  // figure out our temperature range, and expand to 10s place
  const temp_range = get_range([props.hourly.temperature,props.hourly.dewpoint])
  temp_range.min = Math.floor((temp_range.min-5)/10) * 10
  temp_range.max = Math.ceil((temp_range.max+5)/10) * 10

  const wind_range = get_range([props.hourly.windSpeed])
  wind_range.min = Math.floor((wind_range.min-1)/10) * 10
  wind_range.max = Math.ceil((wind_range.max+1)/10) * 10

  // Track mouse position and show cursor with chart readouts
  const track_mouse = (event) => {
    const rect = day_div.current.getBoundingClientRect();
    setCursor(((event.pageX - rect.left)/day_div.current.clientWidth) * 240)
  }
  const clear_mouse = (event) => {
    setCursor(null)
  }
  const mouse_click_or_tap = (event) => {
    const rect = day_div.current.getBoundingClientRect();
    setCursor(((event.pageX - rect.left)/day_div.current.clientWidth) * 240)
  }

  return (
    <>
      <div class="day" onClick={mouse_click_or_tap} onMouseMove={track_mouse} ref={day_div} onMouseLeave={clear_mouse}>
        <Summary day={props.day}/>
        <CursorWeather start={props.day.start} weather={props.hourly.weather} cursor={cursor} />
        <div class="time_cursor">
          <CursorTime cursor={cursor} start={props.day.start} />
          <CursorTime cursor={current} start={props.day.start} />
        </div>
        <TempChart day={props.day} hourly={hourly} temp_range={temp_range} cursor={cursor} current={current} show_yaxis={props.first}/>
        <Legend metrics={[{c:'red',h:'Temp (°F)'},{c:'green',h:'Dewpoint (°F)'}]} show={props.last} />
        <div class="time_cursor">
          <CursorTime cursor={cursor} start={props.day.start} />
          <CursorTime cursor={current} start={props.day.start} />
        </div>
        <PrecipChart day={props.day} hourly={hourly} cursor={cursor} current={current} show_left_yaxis={props.first} show_right_yaxis={props.last} />
        <Legend metrics={[{c:'#999',h:'Cloud Coverage %'},{c:'lightblue',h:'Chance Precip %'},{c:'green',h:'Humidity %'},{c:'magenta',h:'Snow'}]} show={props.last} />
        <div class="time_cursor">
          <CursorTime cursor={cursor} start={props.day.start} />
          <CursorTime cursor={current} start={props.day.start} />
        </div>
        <WindChart day={props.day} hourly={hourly} wind_range={wind_range} cursor={cursor} current={current} show_yaxis={props.first} />
        <Legend metrics={[{c:'darkblue',h:'Wind Speed (mph)'}]} show={props.last} />
      </div>
    </>
  ) 
}


function Summary(props){
  const title = moment(props.day.start).format(DAY_FMT)

  // convert from mm to in
  let snow_amt = ''
  if(props.day.precip_total.snow){
    snow_amt = props.day.precip_total.snow / 25.4
    if(snow_amt >= 12){
      snow_amt = (snow_amt/12).toFixed(1) + ' ft'
    }else{
      snow_amt = (snow_amt).toFixed(1) + ' in'
    }
    snow_amt =  snow_amt + '❄️'
  }
  let rain_amt = ''
  if(props.day.precip_total.rain > 0){
    rain_amt = (props.day.precip_total.rain / 25.4).toFixed(2) + ' in 💧'
  }

  let short_forecast = ''
  if(props.day.day_weather){  short_forecast = props.day.day_weather.shortForecast }
  else if(props.day.night_weather){ short_forecast = props.day.night_weather.shortForecast }

  return (
    <>
      <div class="summary">
        <h3>{title}</h3>
        <p class="weather">{props.day.icon}</p>
        <p>{short_forecast}</p>
        <p class="temp">
          <span class="maxtemp">{formatTemp(props.day.temp.max)}</span> |&nbsp;
          <span class="mintemp">{formatTemp(props.day.temp.min)}</span>
        </p>
        <p class="precip">{snow_amt} {rain_amt}</p>
        <ul>
          <li>Sunrise: {moment(props.day.sun.sunrise).format(HOUR_FMT)}</li>
          <li>Sunset: {moment(props.day.sun.sunset).format(HOUR_FMT)}</li>
        </ul> 
      </div>
    </>
  )
}


function TempChart(props){
  const interval = 10  // degree lines
  const temp = hourly_path(hourly.temperature,props.day.start, v => yval(v,props.temp_range))
  const dewpoint = hourly_path(hourly.dewpoint,props.day.start, v => yval(v,props.temp_range))

  let yaxis = ''
  if(props.show_yaxis){
    yaxis = (<YAxisLabels side="left" range={props.temp_range} interval={interval} label_format={(v)=>v.toFixed(0)+'°F'}/>)
  }

  return (
    <>
      <svg viewBox="0 0 240 300" >
        <DawnDuskUnderlay day={props.day} />
        <YGridUnderlay range={props.temp_range} interval={interval} />
        {yaxis}
        <path d={temp} stroke="red" fill="none" />
        <path d={dewpoint} stroke="green" fill="none" />
        <TimeLineOverlay stroke="orange" x={props.cursor} />
        <TimeLineOverlay stroke="black" x={props.current} />
        <MetricReadout 
          color="red" 
          units="°F" 
          range={props.temp_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.temperature} 
        />
        <MetricReadout 
          color="green" 
          units="°F" 
          range={props.temp_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.dewpoint} 
        />
      </svg>
    </>
  )
}

function PrecipChart(props){
  const precip_range = {min:0,max:100}
  const interval = 25
  const humidity = hourly_path(hourly.relativeHumidity,props.day.start, v => yval(v,precip_range))

  const precip = hourly_path(hourly.probabilityOfPrecipitation,props.day.start, v => yval(v,precip_range))

  // combine precip with snowfall
  const rain = []
  const snow = []
  for(var i=0; i<hourly.probabilityOfPrecipitation.length; i++ ){
    const popv = hourly.probabilityOfPrecipitation[i]
    if(i < hourly.snowfallAmount.length){
      snow.push({value:(hourly.snowfallAmount[i].value > 0)?popv.value:0,time:popv.time})
      rain.push({value:(hourly.snowfallAmount[i].value == 0)?popv.value:0,time:popv.time})
    }
  }
  //console.log(snow,rain)
  const rain_path = hourly_path(rain,props.day.start, v => yval(v,precip_range))
  const snow_path = hourly_path(snow,props.day.start, v => yval(v,precip_range))

  const cloud = hourly_path(hourly.skyCover,props.day.start, v => yval(v,precip_range),true)

  // Right Axis - TODO 4 bar 
  //const pressure = hourly_path(hourly.dewpoint,props.day.start, v => yval(v,precip_range))

  let left_yaxis = ''
  if(props.show_left_yaxis){
    left_yaxis = (
    <YAxisLabels 
      side="left" 
      range={precip_range} 
      label_format={(v) => (v.toFixed(0)+"%")}
      interval={interval} />
    )
  }
  /*
  // Once we get pressure..
  if(props.show_yaxis_right){
    yaxis = (
    <YAxisLabels 
      side="right" 
      range={props.pressure_range} 
      label_fmt={(v) => (v.toFixed(0)+"%")}
      interval={interval} />
    )
  }*/

  return (
    <>
      <svg class="lower_chart" viewBox="0 0 240 300" >
        <DawnDuskUnderlay day={props.day} />
        <YGridUnderlay range={precip_range} interval={interval} />
        {left_yaxis}
        <path d={cloud} stroke="#333" fill="#999" opacity="0.3" />
        <path d={precip} stroke="blue" fill="none" opacity="0.5" />
        <path d={humidity} stroke="green" fill="none" />
        <path d={rain_path} stroke="none" fill="lightblue" opacity="0.5" />
        <path d={snow_path} stroke="none" fill="purple" opacity="0.5" />
        <TimeLineOverlay stroke="orange" x={props.cursor} />
        <TimeLineOverlay stroke="black" x={props.current} />
        <MetricReadout 
          color="#333" 
          units="%" 
          range={precip_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.skyCover} 
        />
        <MetricReadout 
          color="blue" 
          units="%" 
          range={precip_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.probabilityOfPrecipitation} 
        />
        <MetricReadout 
          color="green" 
          units="%" 
          range={precip_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.relativeHumidity} 
        />
      </svg>
    </>
  )
}

function WindChart(props){
  const interval = 5
  const speed = hourly_path(props.hourly.windSpeed,props.day.start, v => yval(v,props.wind_range))
  const metric_format = v => v.toFixed(0)

  let yaxis = ''
  if(props.show_yaxis){
    yaxis = (<YAxisLabels side="left" range={props.wind_range} interval={interval} label_format={v=>v.toFixed(0)+' mph'} />)
  }

  return (
    <>
      <svg class="lower_chart" viewBox="0 0 240 300" >
        <DawnDuskUnderlay day={props.day} />
        <YGridUnderlay range={props.wind_range} interval={interval} />
        {yaxis}
        <path d={speed} stroke="darkblue" fill="none" />
        <WindArrows 
          wind_range={props.wind_range} 
          speeds={props.hourly.windSpeed} 
          dirs={props.hourly.windDirection} 
          start={props.day.start}
          hour_interval={2}
        />
        <TimeLineOverlay stroke="orange" x={props.cursor} />
        <TimeLineOverlay stroke="black" x={props.current} />
        <MetricReadout 
          color="darkblue" 
          units="mph" 
          range={props.wind_range} 
          start={props.day.start} 
          cursor={props.cursor} 
          metric={props.hourly.windSpeed} 
          metric_format={metric_format}
        />
      </svg>
    </>
  )
}

function YGridUnderlay(props){
  const lines = []
  let t = props.range.min
  while(t < props.range.max){
    const y = yval(t,props.range)
    lines.push(<line x1="0" x2="240" y1={y} y2={y} stroke="#aaa" />)
    t += props.interval
  }

  return (
    <>
      <g>
        {lines}
      </g>
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
        <rect fill="#EEE" width={dawn} height="300" />
        <rect fill="#EEE" x={sunset} width={dusk} height="300" />
        <line x1="240" y1="0" x2="240" y2="300" stroke="#aaa" />
      </g>
    </>
  )

}

function TimeLineOverlay(props){
  if(props.x == null){ return '' }
  return (
    <>
      <line x1={props.x} x2={props.x} y1="0" y2="300" stroke={props.stroke} fill="none" />
    </>
  )
}

function MetricReadout(props){
  const metric_format = props.metric_format || (v => v)
  let readout = ''
  if(props.cursor){
    const metric_y = at_cursor(props.metric,props.cursor,props.start)
    
    if(metric_y){
      const tx = (metric_y.x > 200)?(metric_y.x-40):metric_y.x
      const m = 4
      const yv = yval(metric_y.v,props.range)
      const tyv = (yv > 280)?yv-10:((yv <20)?(yv+10):yv)
      readout = (<g>
        <circle cx={metric_y.x} cy={yv} fill={props.color} r="2" />
        <text fill={props.color} x={tx+m} y={tyv+m}>{metric_format(metric_y.v)}{props.units}</text>
      </g>)
    }
  }
  return readout
}

function CursorTime(props){
  if(props.cursor){
    const hour = moment(props.start).add(props.cursor/10,'hours').format('ha')
    const left = `left: ${(props.cursor/240) * 100}%;`
    return (
      <div style={left}>{hour}</div>
    )
  }
  return ''
}

function CursorWeather(props){
  let weather_cursor = ''
  if(props.cursor){
    const weather_data = at_cursor(props.weather,props.cursor,props.start)
    if(weather_data != null){
      const weather = weather_data.v.value[0]
      const left = `left: ${(props.cursor/240) * 100}%;`
      if(weather && weather.weather){
        const weather_cursor_text = [weather.coverage,weather.intensity,weather.weather]
          .filter( v=> v!= null)
          .join(' ')
          .replace('_',' ')
        weather_cursor = (
          <div style={left}>☁️ {weather_cursor_text}</div>
        )
      }

    }
  }
  return (<div class="weather_cursor">{weather_cursor}</div>)
}

function Legend(props){
  let metrics = []
  if(props.show){
    metrics = props.metrics.map( m => {
      return (
        <div class="metric_box">
          <span class="metric_color" style={`background-color: ${m.c};`}></span>
          {m.h}
        </div>
      )
    })
  }
  return (<div class="legend">{metrics}</div>)
}

function WindArrows(props){
  let i=0
  let arrows = props.dirs.map( d => {
    i += 1
    if(i % props.hour_interval != (props.hour_interval-1)){ return '' }
    const x = xval(d.time,props.start)
    const y = yval(props.speeds[i-1].value,props.wind_range) // TODO merge windspeed
    const r = d.value
    return (
      <g transform={`translate(${x},${y}) scale(2) rotate(${r})`}>
        <polygon points="0, 5 -3, -3 0, -1 3, -3" stroke="darkblue" storkeWidth="0.1" fill={wind_fill(props.speeds[i-1].value)} />
      </g>
    )
  })
  return (
    <g>
      {arrows}
    </g> 
  )
}

function YAxisLabels(props){
  const label_format = props.label_format || (v => v.toFixed(0))
  const labels = []
  let t = props.range.min
  while(t < props.range.max){
    const y = yval(t,props.range)
    labels.push(<text x={props.side=="left"?0:220} y={y-2} fill="#aaa">{label_format(t)}</text>)
    t += props.interval
  }
  return (
    <g>
      {labels}
    </g>
  )
}

const HOUR_FMT = 'h:mmA'
const DAY_FMT = 'ddd M/D'

function formatTemp(C){ return (Math.round((C*(9/5)) + 32) + "°F") }

function determine_weather(weather){
  if(weather.precip_total > 0){return {n:"Rainy",i:"☔"} }  // todo drizzle, rain, snow
  if(weather.skyCover > 50){ return {n:"Cloudy",i:"☁️"}; } 
  if(weather.skyCover > 10){ return {n:"Partly Cloudy",i:"⛅"}; }
  return {n:"Sunny",i:"☀️"};
}

// the x position of this date relative to start
function xval(date,start){
  // time is in ms
  return (date.getTime() - start.getTime())/1000/3600 * 10
}
function yval(v,range){
  return 300 - ((v - range.min)/(range.max-range.min) * 300)
}

function hourly_path(values,start,yval,grounded=false){
  const path = values.map( m => {
    return `${xval(m.time,start)} ${yval(m.value)}`
  }).join('L ')
  if(grounded){ // fill in area on bottom of chart
    return 'M0 300 L' + path + 'L240 300'
  }
  return 'M' + path
}

// get the min/max of all the arrays in metrics
function get_range(metrics){
  return metrics.map( metric => {
    return metric.reduce( (p,v) => {
      if(p.min == null || p.min > v.value){ p.min = v.value }
      if(p.max == null || p.max < v.value){ p.max = v.value }
      return p
    },{min:null,max:null})
  }).reduce( (p,v) => {
      if(p.min == null || p.min > v.min){ p.min = v.min }
      if(p.max == null || p.max < v.max){ p.max = v.max }
      return p
  },{min:null,max:null})
}

function at_cursor(metric,cursor,start){
  const after = metric
    .map( h => { 
      return {x:xval(h.time,start),v:h.value} 
    })
    .filter( x => x.x < cursor )

  if(after.length == 0){ return null }
  return after[after.length - 1]
}

// Beaufort Scale Colors
function wind_fill(v){
  for(var i=0; i<wind_force_colors.length; i++){
    if(v < wind_force_colors[i].v){
      return wind_force_colors[i].c
    }
  }
}
const wind_force_colors = [
  {v:10,c:'lightgreen'},
  {v:16,c:'lightblue'}, // color for less than v
  {v:26,c:'darkblue'},
  {v:34,c:'purple'},
  {v:48,c:'orange'},
  {v:1000,c:'red'}, // max
]