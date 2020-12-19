const Emitter = require('events');
const path = require('path');
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
    const citiesFile = path.resolve(__dirname, 'assets', 'cities.txt');
    getCities(citiesFile);
}

function getCities(pathToCitiesFile) {
    fs.readFile(pathToCitiesFile, 'utf8', (err, data) => {
        if (err) emitter.emit(eventTypes['error'], err);
        const cities = data
            .replace(/\r/gm, "")
            .split('\n')
            .filter(city => Boolean(city));
        emitter.emit(eventTypes['gotCities'], cities);
    })
}

function getGeoJsonFiles(cities) {
    const fetchCityDataGenerator = fetchCityData();
    fetchCityDataGenerator.next();
    let progress = 0;
    let percent = Math.round(100 / cities.length);

    function* fetchCityData() {
        for (let i = 1; i < cities.length; i++) {
            yield getGeoJsonByCity(i).then(() => {
                fetchCityDataGenerator.next();
                progress += percent;
                console.log(`Progress: ${progress}%`);
            });
        }
    }
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
    const folderPath = path.resolve(__dirname, 'geoJsons');
    const filePath = path.resolve(__dirname, 'geoJsons', `${city}.json`);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
    fs.writeFile(filePath, geoJson, err => err && emitter.emit(eventTypes['error'], err));
}

function getUrl(city) {
    return `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(city)}&polygon_geojson=1&format=jsonv2`;
}

function onError(error) {
    throw error;
}