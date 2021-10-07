import * as d3 from "d3"
import * as moment from "moment"

function svg(contents){
  const e = document.createElement("svg")
  e.innerHTML = contents
  return e
}
const formatDate = d3.timeFormat("%a %b %-d, %I%p")

export class DaySummary {
  constructor(day) {
    const wv = determine_weather(day);
   
    this.node = svg(`<g font-family="sans-serif" font-size="12" text-anchor="middle">
        <text y="0">${moment(day.noon).format('ddd M/D')}</text>
        <text y="14">${formatTemp(day.temp.max)} | ${formatTemp(day.temp.min)}</text>
        <text y="28">${wv.n} ${wv.i}</text>
        <text y="42">${ day.precip_total.toFixed(1) }" ${(day.precip_total>0?'💧':'')}</text>
    </g>`);
  }
}

export class VertLine {
  constructor(y0,y1,stroke_color) {
    this._pos = svg(`<text x="4" y="${y0} - 12"></text>`);
    this._line = svg(`<path d="M 0 ${y0} L 0 ${y1}" stroke="${stroke_color}">`);
    this._points = svg(`<g></g>`);
    this.node = svg(`<g pointer-events="none" display="none" font-family="sans-serif" font-size="10" text-anchor="middle">
      ${this._pos}
      ${this._line}
    </g>`);
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

export class WindArrow {
  constructor(fill_color) {
    this.node = svg(`<polygon points="0, -5 -3, 3 0, 1 3, 3" fill="${fill_color}">`);
  }
}


export function determine_weather(weather){
  if(weather.precip_total > 0){ return {n:"Rainy",i:"☔"} }  // todo drizzle, rain, snow
  if(weather.skyCover > 50){ return {n:"Cloudy",i:"☁️"}; } 
  if(weather.skyCover > 10){ return {n:"Partly Cloudy",i:"⛅"}; }
  return {n:"Sunny",i:"☀️"};
}

function formatTemp(C){ return (Math.round((C*(9/5)) + 32) + "°F") }