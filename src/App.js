// App.js : main app file
import './App.css';
import React, { useState, useEffect } from 'react';
// import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { MTA, haversineDistance, feedUrl } from './mta';
// import DeckGL from '@deck.gl/react';
// import { ScatterplotLayer } from '@deck.gl/layers';
// import { Map, StaticMap } from 'react-map-gl';
// import gtfsProtoJson from './data/gtfs-realtime.json';
import nyctProtoJson from './data/nyct-subway.json';

const ProtoBuf = require('protobufjs');
// const gtfsRealtime = ProtoBuf.Root.fromJSON(gtfsProtoJson);
const nyctSubway = ProtoBuf.Root.fromJSON(nyctProtoJson);
// gtfsRealtime.addJSON(nyctProtoJson);

// console.log(gtfsRealtime);
// console.log(nyctSubway);
// const FeedMessage = GtfsRealtimeBindings.transit_realtime.FeedMessage;
const FeedMessage = nyctSubway.lookupType('transit_realtime.FeedMessage').ctor;

const INITIAL_RADIUS = 0.2; // miles
const MIN_RADIUS = 0.1; // miles
const MAX_RADIUS = 20; // miles

const TRIP_ID_RE = /(?<originTime>\d+)_(?<routeId>[0-9A-Z]+)\.\.(?<direction>[N|S])(?<pathId>[0-9A-Z]*)/;
const NUM_TRAINS = 3; // length of departure tables

const formatDistance = ((num) => {
  const sigfigs = 2;
  const rounded = parseFloat(num.toPrecision(sigfigs));
  return `${rounded} mi`;
});

const rad2radInd = ((rad) => {
  const coercedRad = Math.min(Math.max(rad, MIN_RADIUS), MAX_RADIUS); // coerce to MIN and MAX vals
  console.log(coercedRad);
  return Math.round(Math.log10(coercedRad) * 3);
});

const MIN_RAD_IND = rad2radInd(MIN_RADIUS);
const MAX_RAD_IND = rad2radInd(MAX_RADIUS);

console.log(MIN_RAD_IND);
console.log(MAX_RAD_IND);

const radInd2rad = ((radInd) => {
  const coercedRadInd = Math.min(Math.max(radInd, MIN_RAD_IND), MAX_RAD_IND); // coerce to MIN and MAX vals
  return parseFloat(Math.pow(10, coercedRadInd/3).toPrecision(1));
});

const NearbyStationsPage = ((props) => {
  const [radius, setRadius] = useState(INITIAL_RADIUS);
  console.log(radius);

  const stationsInRadius = (rad)  => {
    const stationDictsWithDist = MTA.STATIONS.map(d => (
      {...d, ...{Distance: haversineDistance(props.location, [Number(d['GTFS Latitude']), Number(d['GTFS Longitude'])])}}
    )).sort((a,b) => a.Distance - b.Distance);
    // const stationDictsWithDist = MTA.STATIONS.map(d => ({...d, ...{Distance: NaN}}));
    if (stationDictsWithDist.some(d => d.Distance < rad)) {
      const stationDictsToDisplay = stationDictsWithDist.filter(d => d.Distance < rad);
      return (
        <>
          <h2>Stations within {rad} mi:</h2>
          <div className='stationContainer' >
            {stationDictsToDisplay.map((d,i) => <Station stationDict={d} key={i} />)}
          </div>
        </>
      );
    } else {
      const stationDictsToDisplay = stationDictsWithDist.slice(0,1);
      return (
        <>
          <h2>Nearest stations:</h2>
          <div className='stationContainer' >
            {stationDictsToDisplay.map((d,i) => <Station stationDict={d} key={i} />)}
          </div>
        </>
      );
    }
  };

  const formatLocation = ((coords) => {
    // assuming coords are lat, lon

    const toDMS = ((decDeg) => {
      const intDeg = Math.floor(decDeg);
      const intMin = Math.floor((decDeg - intDeg) * 60);
      const intsec = Math.round((decDeg - intDeg  - intMin / 60) * 3600);
      return (
        <>{intDeg}&deg; {intMin}' {intsec}"</>
      );
    });

    const northsouthLetter = coords[0] >= 0 ? 'N' : 'S';
    const eastwestLetter = coords[1] >= 0 ? 'E' : 'W';
    const absLat = Math.abs(coords[0]);
    const absLon = Math.abs(coords[1]);

    return (
      <>
         {toDMS(absLat)} {northsouthLetter} {toDMS(absLon)} {eastwestLetter}
      </>
    );

  });

  if (props.location[0]) {
    return (
      <>
        <h1>NYC Subway Stations</h1>
        <div className='rangeSelector' >
          <div className='deckContainer' >
            {/* <DeckGL
              initialViewState={{
                longitude: props.location[0],
                latitude: props.location[1],
                zoom: 12,
                pitch: 0,
                bearing: 0,
              }}
              controller={true}
              layers={[
                new ScatterplotLayer({
                  data,
                  getColor: 'red',
                  getSize: '20px',
                })
              ]}
            >
              <Map
              mapStyle='mapbox://styles/mapbox/light-v9'
              mapboxAccessToken={MTA.MAPBOX_KEY}
              />
            </DeckGL> */}
          </div>
          <div style={{fontStyle: 'italic', margin: '0em 1em 1em 1em'}}>
              Your location is {formatLocation(props.location)}
          </div>
          <input 
            type='range'
            defaultValue={rad2radInd(radius)}
            min={MIN_RAD_IND}
            max={MAX_RAD_IND}
            name='radius'
            onChange={(ev) => {
              setRadius(radInd2rad(ev.target.value));
            }}
          />
          <label htmlFor='radius'>Radius: {radius} mi</label>
        </div>
        {stationsInRadius(radius)}
      </>
    );
  } else {
    return (
      <h2>Getting location ...</h2>
    );
  }
});

const Station = ((props) => {
  const [feedEntities, setFeedEntities] = useState([]);

  const lines = props.stationDict['Daytime Routes'];
  const lineIcons = lines.map((l,i) => 
    <img
      className='nameIcon'
      src={require(`./data/lineIcons/${l}.svg`)}
      alt={l + 'icon'}
      key={i}
    />
  );

  const matchingStopTimeUpdate = ((stopTimeUpdate) => {
    return stopTimeUpdate.stopId.includes(props.stationDict['GTFS Stop ID'])
    && stopTimeUpdate.departure
    && stopTimeUpdate.departure.time * 1000 > Date.now();
  });

  const matchingTripUpdate = ((tripUpdate) => {
    return tripUpdate.stopTimeUpdate.some(matchingStopTimeUpdate);
  });

  const parseTripId = ((tripId) => {
    const reArray = TRIP_ID_RE.exec(tripId);
    if (reArray) {
      const newMillisec = parseInt(reArray.groups.originTime) * 600;
      const originMidnight = new Date(new Date().toLocaleDateString("en-US", {timeZone: "America/New_York"}));
      const originDate = new Date(originMidnight.valueOf() + newMillisec);
      const tripDict = {...reArray.groups, ...{originDate: originDate}}
      return tripDict;
    } else {
      console.error(`Failed parsing tripId: ${tripId}`);
    }
  });

  const tripUpdateToDict = ((tripUpdate) => {
    const tripDict = parseTripId(tripUpdate.trip.tripId);
    const matchingUpdate = tripUpdate.stopTimeUpdate.find(matchingStopTimeUpdate);
    const lastUpdate = tripUpdate.stopTimeUpdate[tripUpdate.stopTimeUpdate.length-1];
    const lastStopId = lastUpdate.stopId.replace(/[N|S]$/,'');
    const lastStopName = MTA.STATIONS.find(d => d['GTFS Stop ID'] === lastStopId)['Stop Name'];
    const departureDate = matchingUpdate.departure ? new Date(matchingUpdate.departure.time * 1000) : null;
    return {
      line: tripUpdate.trip.routeId,
      departure: departureDate,
      direction: tripDict.direction,
      lastStop: lastStopName,
    }
  })

  const genDepartures = ((entities) => {
    const tripUpdates = entities.filter(en => en.hasOwnProperty('tripUpdate')).map(en => en.tripUpdate);
    const matchingTripUpdates = tripUpdates.filter(matchingTripUpdate);
    const tripDicts = matchingTripUpdates.map(tripUpdateToDict);
    const southTripDicts = tripDicts.filter(d => d.direction === 'S' && d.departure).sort((a,b) => a.departure - b.departure);
    const northTripDicts = tripDicts.filter(d => d.direction === 'N' && d.departure).sort((a,b) => a.departure - b.departure);
  
    const formatWaitMinutes = ((date) => {
      const currentDate = new Date();
      const waitMin = (date - currentDate) / 60000;
      if (waitMin < 1) {
        return '< 1';
      } else {
        return waitMin.toFixed(0);
      }
    });

    const departureTable = ((tripDicts, label) => {
      return (
        <table className='departureTable' >
          <tbody>
          <tr>
            <th colSpan="3" >{label}</th>
          </tr>
            {tripDicts.slice(0, NUM_TRAINS).map((d,i) => <tr key={i}>
              <td>
                <img className='departureIcon' src={require(`./data/lineIcons/${d.line}.svg`)}
                alt={d.line + 'icon'}/>
              </td>
              <td >{d.lastStop}</td>
              <td style={{textAlign: 'right'}} >({formatWaitMinutes(d.departure)} min)</td>
          </tr>)}
          </tbody>
        </table>
      );
    });

    return (
      <>
        {departureTable(southTripDicts, props.stationDict['South Direction Label'])}
        {departureTable(northTripDicts, props.stationDict['North Direction Label'])}
      </>
    );
  });

  const buffToFeedEntities = ((arrayBuffer) => {
    return FeedMessage.decode(new Uint8Array(arrayBuffer)).entity;
  });

  useEffect (() => {
    Promise.all([...new Set(lines.map(feedUrl))]
    .map(u => fetch(u, {headers: {'x-api-key': MTA.MTA_KEY}})))
    .then(respList => Promise.all(respList.map(resp => resp.arrayBuffer()))
    .then(buffList => setFeedEntities(buffList.map(buffToFeedEntities).flat(1))));
  }, []);

  return (
    <div className='station'>
      <h4 className='stationName' >
        {props.stationDict['Stop Name']}
        <span className='nameIconContainer' >
          {lineIcons}
        </span>
        <span className='italic' >
          ({formatDistance(props.stationDict.Distance)})
        </span>
      </h4>
      <div className='departureTableContainer'>
        {feedEntities.length ? genDepartures(feedEntities) : <div>Loading departures ...</div>}
      </div>
    </div>
  )
});

const App = () => {
  // const [location, setLocation] = useState([null, null]);
  const [location, setLocation] = useState([40.8057752, -73.9664714]); // NYC
  // const [location, setLocation] = useState([37.6130941, -122.384315]); // SF
  console.log('React App rerendered.');

  // console.log('Location fetching turned off!');
  useEffect (() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setLocation([lat, lon]);
    });
  }, []);

  return (
    <div className='App'>
        <NearbyStationsPage
          location={location}
        />
    </div>
  );
}

export default App;
