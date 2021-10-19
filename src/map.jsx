import { useState, useEffect, useRef } from 'preact/hooks';
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"

export function Map(props){
  const [map,setMap] = useState(null)
  const map_ref = useRef(null)

  useEffect(() => {
    if(map == null){
      setMap(build_map(map_ref.current,props.center))
    }
  })

  if(map!=null){
    update_map(map,props.center,props.data)
  }

  return (
    <>
      <div id="map" ref={map_ref}>
      </div>
    </>
  )
}

function build_map(element,latlng){
  let map = L.map(element).setView([latlng.lat,latlng.lng], 12);
  let osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    maxZoom: 19,
	    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      pane: 'tilePane'
  }).addTo(map);
  return map
}

function update_map(map,latlng,data){
  map.eachLayer( l => {
    if(l.options.pane == 'overlayPane'){ l.remove() }
  }) 
  map.setView([latlng.lat,latlng.lng],12)
  L.marker([latlng.lat,latlng.lng],{pane:'overlayPane'}).addTo(map)
    .bindPopup(data.station.name)
  L.geoJSON(data.raw.forecast, {
		style: function (feature) {
			return feature.properties && feature.properties.style;
		},
	}).addTo(map)
  console.log(data.raw.forecast.geometry.coordinates[0])
  console.log(latlng)
}