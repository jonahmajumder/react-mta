// mta.js : mta-related helper functions
import stations from './data/stations.json';
import lineColors from './data/lineColors.json';

export function feedUrl(line) {
    switch (line) {
        case 'A':
        case 'C':
        case 'E':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace';
        case 'B':
        case 'D':
        case 'F':
        case 'M':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm';
        case 'G':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g';
        case 'J':
        case 'Z':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz';
        case 'N':
        case 'Q':
        case 'R':
        case 'W':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw';
        case 'L':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l';
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs';
        case 'SI':
        case 'SIR':
            return 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si';
        default:
            console.error('Unrecognized line: %s', line);
    }
};

export const haversineDistance = (point1, point2) => {
    const deg2rad = deg => deg / 180 * Math.PI;
    const lat1 = deg2rad(point1[0]);
    const lat2 = deg2rad(point2[0]);
    const lon1 = deg2rad(point1[1]);
    const lon2 = deg2rad(point2[1]);
    const latDiff = lat2 - lat1;
    const lonDiff = lon2 - lon1;

    const hav = (theta) => {return Math.pow(Math.sin(theta / 2), 2)};
    const invhav = (havtheta) => {return 2 * Math.asin(Math.sign(havtheta) * Math.sqrt(Math.abs(havtheta)))};

    const havtheta = hav(latDiff) + Math.cos(lat1) * Math.cos(lat2) * hav(lonDiff);
    // console.log(`cos lat 1: ${Math.cos(lat1).toFixed(6)}`)
    // console.log(`cos lat 2: ${Math.cos(lat2).toFixed(6)}`)
    // console.log(`hav lat diff: ${hav(latDiff).toFixed(6)}`);
    // console.log(`hav lon diff: ${hav(lonDiff).toFixed(6)}`);

    const theta = invhav(havtheta);
    const rEarth = 3957.6; // earth radius at NYC latitude, in miles

    return rEarth * theta;
};

// const LINES = [
//     'A', 'C', 'E', 'B', 'D', 'F', 'M', 'G',
//     'J', 'Z','N', 'Q', 'R', 'W', 'L',
//     '1', '2', '3', '4', '5', '6', '7', 'SI'
// ];

export const MTA = {
    MTA_KEY: 'r9T8w9WnQUC00HNIRMQe2Uk5X5bPH0DCNYAxlp90',
    MAPBOX_KEY: 'pk.eyJ1Ijoiam9uYWhtYWp1bWRlciIsImEiOiJjbGQyZHJrNTIwMWprM3Bxb3JuN2ZldTgyIn0.1YQD2dDZe4Njl1Oh7bfNRw',
    STATIONS: stations,
    LINE_COLORS: lineColors,
};