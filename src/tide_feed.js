import moment from "moment"

// https://api.tidesandcurrents.noaa.gov/api/prod/

export async function load_tides(latlng){
  // Get all tidal stations and sort by distance from latlng
  const stations = await fetch(
    'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json'
  ).then(response => response.json())
  console.log(stations.stations.filter(station=>station.id=="9410170"))
  // Find nearest station by great circle algorithm
  const stationsByDistance = stations.stations.filter(station => station.tidal).map(station => {
    return {
      ...station,
      distance: greatCircleMeters(latlng,{lat:station.lat,lng:station.lng}),
    }
  }).sort((a,b) => a.distance - b.distance)
  console.log("Tide stations by distance",stationsByDistance)
  const nearest = stationsByDistance[0]

  if(nearest.distance > 50e3){
    // How far before we don't show tides?
    return
  }
  // Take the neares
  console.log("Nearest tidal station is ",nearest.name)
  const date = moment()
  const params = new URLSearchParams({
    begin_date: date.format('YYYYMMDD'),
    end_date: date.add(8,'days').format('YYYYMMDD'),
    station: nearest.id,
    product: 'predictions',
    datum: 'MLLW',
    interval: 15,
    // local time zone.. This might be problematic, so maybe we switch to gmt?
    // but need to update the begin_date appropriately
    time_zone: 'lst_ldt',
    units: 'english',
    application: 'weather.nikolaj.dev',
    format: 'json',
  })
  const tides = await fetch(
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params}`
  ).then(response=>response.json())
  console.log(`Tides for ${nearest.name}`,tides)
  return {
    station: nearest,
    tides: tides.predictions
  }
}

// https://en.wikipedia.org/wiki/Great-circle_distance
function greatCircleMeters(a,b){
  const rad = (angle) => angle * Math.PI/180
  return 6.371e6 * Math.acos(
    Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng-a.lng))
  )
}