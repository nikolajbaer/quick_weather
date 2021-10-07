import * as d3 from "d3"
import { DaySummary,VertLine,WindArrow } from "./d3_elements"
import * as moment from "moment"

const margin = ({top: 26, right: 20, bottom: 4, left: 30})
const height = 200
const width = 800

export function chart(days,hourly){
  const full_height = height*3
  const chart_y = height * 0.5

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, full_height])
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");

  // Axis
  function get_day_extent(hourly){
    const days = d3.extent(hourly.temperature, d => d.time)
    return [moment(days[0]).startOf('day').toDate(),moment(days[1]).endOf('day').toDate()]
  }
  const day_extent = get_day_extent(hourly)

  console.log("day extent",day_extent)

  const temp_y = d3.scaleLinear()
    .domain(d3.extent(d3.merge([hourly.dewpoint,hourly.temperature]), d => d.value)).nice()
    .range([height - margin.bottom, margin.top])

  const x_time = d3.scaleTime()
    .domain(day_extent)
    .range([margin.left, width - margin.right])
    .clamp(true)

  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x( d => x_time(d.time) )
    .y(d => temp_y(d.value) ) 

  const precip_yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(precip_y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1))
    .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start"))

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(temp_y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1))
    .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start"))

  const precip_y = d3.scaleLinear()
    .domain([0,100]).nice()
    .range([height - margin.bottom, margin.top])

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(d3.timeHour.every(12)))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("y2", -height)
        .attr("stroke-opacity", 0.1))



  // Days Grid
  const days_grid = svg.append("g")
 
  const day_blocks = days_grid.selectAll(".days")
    .data(days)
    .join("g")
      .attr("class","day")
  
  // midnight to sunrise
  day_blocks.append("rect")
        .attr("x", d => x_time(d.start))
        .attr("width",d => x_time(d.sun.sunrise) - x_time(d.start))
        .attr("y", chart_y)
        .attr("height",height*3)
        .attr("opacity",0.5)
        .attr("fill","#eee")
  
  day_blocks.append("path")
        .attr("d", d => {
            const day_x = x_time(d.start);
            return `M ${day_x} ${chart_y} L ${day_x} ${height*3 + chart_y}` 
        })
        .attr("stroke","#eee")
        .attr("stroke-width", "1")
  // sunset to midnight
  
  day_blocks.append("rect")
        .attr("x", d => x_time(d.sun.sunset))
        .attr("y", chart_y)
        .attr("width",d => x_time(d.end) - x_time(d.sun.sunset))
        .attr("height",height*3)
        .attr("opacity",0.5)
        .attr("fill","#eee")
  
  const dayShort = d3.timeFormat('%a %m/%d')
  day_blocks.append((d) => {
      const ds = new DaySummary(d)
      return ds.node
    }).attr("transform", d => `translate(${x_time(d.noon)},10)` )
  
  // Top Chart
  const top = svg.append("g")
      .attr("transform", "translate(0," + chart_y + ")");

  //top.append("g")
  //    .call(xAxis);

  top.append("g")
      .call(yAxis);

  const temp = top.append("path")
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1);

  const dewpoint = top.append("path")
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("stroke-width", 1);


  temp.datum(hourly.temperature).attr("d", line);
  dewpoint.datum(hourly.dewpoint).attr("d", line);

  // Bottom Chart
  const bottom = svg.append("g")
    .attr("transform", "translate(0," + (chart_y + height) + ")");
  
 //bottom.append("g")
 //     .call(xAxis);
  
  bottom.append("g")
      .call(precip_yAxis);
  
  const skycover = bottom.append("path")
    .attr('fill','none')
    .attr("stroke","#aaa")
    .attr("stroke-width",1)
  
  const skycover_area = bottom.append("path")
    .attr("fill","#ddd")
    .attr("opacity",0.5)
  
  const precip = bottom.append("path")
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-width", 1);

  const precip_area = bottom.append("path")
    .attr("fill","lightsteelblue")
    .attr("opacity",0.5)

  const precip_line = d3.line()
    .x( d => x_time(d.time) )
    .y(d => precip_y(d.value) )    

  const humidity = bottom.append("path")
      .attr("fill", "none")
      .attr("stroke", "lightgreen")
      .attr("stroke-width", 1);
  
  precip_area.datum(hourly.probabilityOfPrecipitation).attr("d", d3.area()
        .x( d => x_time(d.time) )
        .y0(height - margin.bottom)
        .y1(d => precip_y(d.value) ) )
  
  skycover_area.datum(hourly.skyCover).attr("d", d3.area()
        .x( d => x_time(d.time) )
        .y0(height - margin.bottom)
        .y1(d => precip_y(d.value) ) )
  
  precip.datum(hourly.probabilityOfPrecipitation).attr("d", precip_line);
  skycover.datum(hourly.skyCover).attr("d", precip_line);
  humidity.datum(hourly.relativeHumidity).attr("d",precip_line);


  const dawn_time_blocks = d3.area()
  .x0( d => x_time(d.start) )
  .x1( d => x_time(d.sunrise) )
  .y0(0)
  .y1(height)

  // Wind Chart
  
  const windchart = svg.append("g")
    .attr("transform", "translate(0," + (chart_y + height * 2) + ")");
  
  const wind_line = d3.line()
    .curve(d3.curveCatmullRom)
    .x( d => x_time(d.time) )
    .y(d => windspeed_y(d.value * 0.621371) ) // convert kmph to mph

  const windspeed_y = d3.scaleLinear()
    .domain([0,d3.max(hourly.windSpeed,d => d.value * 0.621371)]).nice() // kmph to mph
    .range([height/2 - margin.bottom, margin.top])

  //windchart.append("g")
  //    .call(xAxis);

 const windspeed_yAxis =  g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(windspeed_y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("x2", width)
        .attr("stroke-opacity", 0.1))
    .call(g => g.append("text")
        .attr("x", -margin.left)
        .attr("y", 10)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")) 
  windchart.append("g")
      .call(windspeed_yAxis);
  
  const windspeed = windchart.append("path")
    .attr('fill','none')
    .attr("stroke","darkblue")
    .attr("stroke-width",1)
   
  windspeed.datum(hourly.windSpeed).attr("d",  wind_line);
  
  const wind_dir_pts = d3.zip(hourly.windSpeed,hourly.windDirection)
                         .filter( d => d[0].time.getHours() % 3 == 0)
  const wind_arrows = windchart.selectAll('.arrow')
    .data( wind_dir_pts )
    .join("g")
      .attr("class","arrow")
      .attr("transform",d => `translate(${x_time(d[0].time)},${windspeed_y(d[0].value * 0.621371)}) scale(1.5) rotate(${d[1].value})`)
      .append(d => new WindArrow("darkblue").node)
  
  // Mouse Line
  const dateLine = new VertLine(chart_y,full_height,"orange")
       
  svg.append("g")
      .attr("fill", "none")
      .attr("pointer-events", "all")
    .append("rect")
      .attr("x", d => x_time(day_extent[0]))
      .attr("y", chart_y )
      .attr("height", height*2)
      .attr("width", x_time(day_extent[1]) - x_time(day_extent[0]))
      .on("mousemove", (e) => {
        const t = moment(x_time.invert(e.offsetX)).toDate();
        const points = [
        ] // TODO capture current point on each line to show cursor
        dateLine.show(e.offsetX,e.offsetY,t,points)
      })
      .on("mouseout", () => {
        dateLine.hide()
      });
  
  const curTime = new VertLine(chart_y,full_height,"black")
  const n = new Date()
  curTime.show(x_time(n),0,null)
  svg.append(() => curTime.node)
  
  svg.append(() => dateLine.node)
  
  return svg.node();
}