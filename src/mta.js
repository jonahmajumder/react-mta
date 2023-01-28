// mta.js : mta-related helper functions
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
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

// export const getFeed = async (line) => {
//     const resp = await fetch(
//         feedUrl(line),
//         {headers: {'x-api-key': MTA.MTA_KEY}},
//     );
//     if (!resp.ok) {
//         console.error(`${resp.url}: ${resp.status} ${resp.statusText}`);
//     }
//     const buffer = await resp.arrayBuffer();
//     const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
//         new Uint8Array(buffer)
//     );
//     return feed;
// };

export const haversineDistance = (point1, point2) => {
    const lon1 = point1[0] * Math.PI/180;
    const lon2 = point2[0] * Math.PI/180;
    const lat1 = point1[1] * Math.PI/180;
    const lat2 = point2[1] * Math.PI/180;
    const lonDiff = lon2 - lon1;
    const latDiff = lat2 - lat1;

    const hav = (theta) => {return Math.pow(Math.sin(theta / 2), 2)};
    const invhav = (havtheta) => {return 2 * Math.asin(Math.sqrt(havtheta))};

    const havtheta = hav(latDiff) + Math.cos(point1[1]) * Math.cos(point2[1]) * hav(lonDiff);
    const theta = invhav(havtheta);

    const rEarth = 6.3781e6;
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