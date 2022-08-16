const axios = require('axios');
const parseStringPromise = require('xml2js').parseStringPromise;


// Structure loosely based on https://github.com/mikesprague/localweather-io/blob/main/src/functions/location-and-weather.js
exports.handler = async function (event, context) {
    const { lat, lng } = event.queryStringParameters || null;

    const callbackHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if(!lat || !lng){
        return {headers:callbackHeaders,statusCode:400,body:JSON.stringify("lat and lng are required parameters")}
    }

    const ndfdUrl = `https://digital.mdl.nws.noaa.gov/xml/sample_products/browser_interface/ndfdXMLclient.php?lat=${lat}&lon=${lng}&product=time-series`
    const ndfdPromise = await axios.get(ndfdUrl).then( (response) => {
        const data = parseStringPromise(response.data).then( (data) => {
            const waterState = data.dwml.data[0].parameters[0]['water-state'][0]
            const timeLayout = data.dwml.data[0]['time-layout'].filter(tl => tl['layout-key'][0] == waterState['$']['time-layout'])[0]['start-valid-time']
            const waveHeights = waterState.waves[0].value

            return {
                timeLayout: timeLayout,
                waveHeights: waveHeights,
            }
        })
        return data
    })
    return {
        statusCode: 200,
        body: JSON.stringify({ 
            waveHeights: ndfdPromise.waveHeights,
            timeLayout: ndfdPromise.timeLayout,
        }),
    };
};


