const Emitter = require('events');
const axios = require('axios');
const fs = require('fs');

const emitter = new Emitter();
const eventTypes = {
    'gotCities': 'GOT_CITIES',
    'gotGeoJson': 'GOT_GEO_JSON',
    'error': 'ERROR'
}

emitter.on(eventTypes['gotCities'], getGeoJsonFiles);
emitter.on(eventTypes['gotGeoJson'], saveGeoJson);
emitter.on(eventTypes['error'], onError);

start();

function start() {
    getCities(`${__dirname}/assets/cities.txt`);
}

function getCities(pathToCitiesFile) {
    fs.readFile(pathToCitiesFile, 'utf8', (err, data) => {
        if (err) emitter.emit(eventTypes['error'], err);
        const cities = data.split('\n').filter(city => Boolean(city));
        emitter.emit(eventTypes['gotCities'], cities);
    })
}

function getGeoJsonFiles(cities) {
    setTimeout(() => {
        getGeoJsonByCity(cities[0]).catch(err => console.log(err));
    }, 100)
    // for (let i = 0; i < cities.length; i++) {
    //     getGeoJsonByCity(cities[i]);
    // }
}

async function getGeoJsonByCity(cityName) {
    const url = getUrl(cityName);
    try {
        const {data} = await axios.get(url);
        const [city] = data;
        emitter.emit(eventTypes['gotGeoJson'], cityName, JSON.stringify(city['geojson']));
    } catch (err) {
        emitter.emit(eventTypes['error'], err);
    }
}

function saveGeoJson(city, geoJson) {
    const folderPath = `${__dirname}/geoJsons`;
    const filePath = `${folderPath}/${city}.json`;
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
    fs.writeFile(filePath, geoJson, err => err && emitter.emit(eventTypes['error'], err));
}

function getUrl(city) {
    return `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(city)}&polygon_geojson=1&format=jsonv2`;
}

function onError(error) {
    throw error;
}