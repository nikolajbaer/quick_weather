import * as d3 from "d3"

class DaySummary {
  constructor(day) {
    const wv = determine_weather(day);
   
    this.node = svg`<g font-family="sans-serif" font-size="12" text-anchor="middle">
        <text y="0">${moment(day.noon).format('ddd M/D')}</text>
        <text y="14">${formatTemp(day.temp.max)} | ${formatTemp(day.temp.min)}</text>
        <text y="28">${wv.n} ${wv.i}</text>
        <text y="42">${ day.precip_total.toFixed(1) }" ${(day.precip_total>0?'💧':'')}</text>
    </g>`;
  }
}

class VertLine {
  constructor(y0,y1,stroke_color) {
    this._pos = svg`<text x="4" y="${y0} - 12"></text>`;
    this._line = svg`<path d="M 0 ${y0} L 0 ${y1}" stroke="${stroke_color}">`;
    this._points = svg`<g></g>`;
    this.node = svg`<g pointer-events="none" display="none" font-family="sans-serif" font-size="10" text-anchor="middle">
      ${this._pos}
      ${this._line}
    </g>`;
  }
  show(x,y,t,points) {
    this.node.removeAttribute("display");
    this.node.setAttribute("transform", `translate(${x},0)`);
    if(t){
      this._pos.textContent = `${formatDate(t)}`
    }else{ this._pos.textContent = '' };
    
    if(!points){ points = [] }
    points.forEach( p => {
        // todo create text element and place it for every point
    })
    
  }
  hide() {
    this.node.setAttribute("display", "none");
  }
}

class WindArrow {
  constructor(fill_color) {
    this.node = svg`<polygon points="0, -5 -3, 3 0, 1 3, 3" fill="${fill_color}">`;
  }
}

const wind_line = d3.line()
    .curve(d3.curveCatmullRom)
    .x( d => x(d.time) )
    .y(d => windspeed_y(d.value * 0.621371) ) // convert kmph to mph

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

const windspeed_y = d3.scaleLinear()
    .domain([0,d3.max(hourly.windSpeed,d => d.value * 0.621371)]).nice() // kmph to mph
    .range([height/2 - margin.bottom, margin.top])

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
    .call(d3.axisLeft(y))
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

const y = d3.scaleLinear()
    .domain(d3.extent(d3.merge([hourly.dewpoint,hourly.temperature]), d => d.value)).nice()
    .range([height - margin.bottom, margin.top])

const x = d3.scaleTime()
    .domain(day_extent)
    .range([margin.left, width - margin.right])
    .clamp(true)

function day_extent(){
  const days = d3.extent(hourly.temperature, d => d.time)
  return [moment(days[0]).startOf('day').toDate(),moment(days[1]).endOf('day').toDate()]
}

const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(d3.timeHour.every(12)))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").clone()
        .attr("y2", -height)
        .attr("stroke-opacity", 0.1))

const precip_line = d3.line()
    .x( d => x(d.time) )
    .y(d => precip_y(d.value) )

const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x( d => x(d.time) )
    .y(d => y(d.value) )

const dawn_time_blocks = d3.area()
  .x0( d => x(d.start) )
  .x1( d => x(d.sunrise) )
  .y0(0)
  .y1(height)

