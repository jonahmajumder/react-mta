// App.js : main app file
import './App.css';
import React, { useState, useEffect } from 'react';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { MTA, haversineDistance, feedUrl } from './mta';
import ProtoBuf from 'protobufjs';
// import DeckGL from '@deck.gl/react';
// import { ScatterplotLayer } from '@deck.gl/layers';
// import { Map, StaticMap } from 'react-map-gl';

const INITIAL_RADIUS = 300; // meters
const MIN_RADIUS = 10; // meters
const MAX_RADIUS = 5000; // meters

const NUM_TRAINS = 5; // length of departure tables

// const nyctProtoFile = require('./data/nyct-subway.proto');

// console.log(nyctProtoFile);
// ProtoBuf.Root.fromDescriptor(nyctProtoFile)

const NearbyStationsPage = ((props) => {
  const [radius, setRadius] = useState(INITIAL_RADIUS);

  // console.log('Range Selector rendered.');

  const stationsInRadius = (rad)  => {
    const stationDictsWithDist = MTA.STATIONS.map(d => (
      {...d, ...{Distance: haversineDistance(props.location, [Number(d['GTFS Longitude']), Number(d['GTFS Latitude'])])}}
    )).sort((a,b) => a.Distance - b.Distance);
    var stationDictsInRadius;
    if (stationDictsWithDist.some(d => d.Distance < rad)) {
      stationDictsInRadius = stationDictsWithDist.filter(d => d.Distance < rad);
    } else {
      stationDictsInRadius = stationDictsWithDist.slice(0,1);
    }
    return stationDictsInRadius.map((d,i) => <Station stationDict={d} key={i} />);
  };

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
              {'Your location is (' + props.location[0].toFixed(4) + ', ' + props.location[1].toFixed(4) + ')'}
          </div>
          <input 
            type='range'
            defaultValue={radius}
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            name='radius'
            onChange={(ev) => {
              setRadius(ev.target.value);
            }}
          />
          <label htmlFor='radius'>Radius: {radius} m</label>
        </div>
        <h2>Nearest stations:</h2>
        <div className='stationContainer' >
          {stationsInRadius(radius)}
        </div>
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

  const buffToFeedEntities = ((arrayBuffer) => {
    return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer)).entity;
  });

  const matchingStopTimeUpdate = ((stopTimeUpdate) => {
    return stopTimeUpdate.stopId.includes(props.stationDict['GTFS Stop ID']);
  });

  const matchingTripUpdate = ((tripUpdate) => {
    return tripUpdate.stopTimeUpdate.some(matchingStopTimeUpdate)
  });

  const tripUpdateToDict = ((tripUpdate) => {
    console.log(tripUpdate);
    const matchingUpdate = tripUpdate.stopTimeUpdate.find(matchingStopTimeUpdate);
    const lastUpdate = tripUpdate.stopTimeUpdate[tripUpdate.stopTimeUpdate.length-1];
    const lastStopId = lastUpdate.stopId.replace(/[N|S]$/,'');
    const lastStopName = MTA.STATIONS.find(d => d['GTFS Stop ID'] === lastStopId)['Stop Name'];
    const departure = matchingUpdate.departure;
    const departureDatetime = departure ? new Date(departure.time * 1000) : null;
    const directionMatch = /[N|S]$/.exec(matchingUpdate.stopId);
    const direction = directionMatch ? directionMatch[0] : null;
    return {
      line: tripUpdate.trip.routeId,
      departure: departureDatetime,
      direction: direction,
      lastStop: lastStopName,
    }
  })

  const genDepartures = ((entities) => {
    const tripUpdates = entities.filter(en => en.hasOwnProperty('tripUpdate')).map(en => en.tripUpdate);
    const matchingTripUpdates = tripUpdates.filter(matchingTripUpdate);
    const tripDicts = matchingTripUpdates.map(tripUpdateToDict);
    
    const southTripDicts = tripDicts.filter(d => d.direction === 'S' && d.departure).sort((a,b) => a.departure - b.departure);
    const northTripDicts = tripDicts.filter(d => d.direction === 'N' && d.departure).sort((a,b) => a.departure - b.departure);
  
    const minutesUntilDatetime = ((datetime) => {
      const currentDatetime = new Date();
      return Math.max((datetime - currentDatetime)/60000, 0).toFixed(0);
    });

    const departureTable = ((tripDicts, label) => {
      return (
        <table className='departureTable' >
          <thead>
            <th colspan="3" >{label}</th>
          </thead>
          <tbody>
          {tripDicts.slice(0, NUM_TRAINS).map((d,i) => <tr key={i}>
            <td>
              <img className='departureIcon' src={require(`./data/lineIcons/${d.line}.svg`)}
              alt={d.line + 'icon'}/>
            </td>
            <td >{d.lastStop}</td>
            <td style={{textAlign: 'right'}} >({minutesUntilDatetime(d.departure)} min)</td>
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

  useEffect (() => {
    Promise.all([...new Set(lines.map(feedUrl))]
    .map(u => fetch(u, {headers: {'x-api-key': MTA.MTA_KEY}})))
    .then(respList => Promise.all(respList.map(resp => resp.arrayBuffer()))
    .then(buffList => setFeedEntities(buffList.map(buffToFeedEntities).flat(1))));
  }, []);

  const withSigFigs = ((num, sigfigs, unit) => {
    if (!unit) {
      const unit = '';
    }

    const rounded = parseFloat(num.toPrecision(sigfigs));
    if (rounded < 1000) {
      return `${rounded} ${unit}`;
    } else {
      return `${rounded/1000} k${unit}`;
    }
  });

  return (
    <div className='station'>
      <h4 className='stationName' >
        {props.stationDict['Stop Name']}
        <span className='nameIconContainer' >
          {lineIcons}
        </span>
        <span className='italic' >
          ({withSigFigs(props.stationDict.Distance, 2, 'm')})
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
  const [location, setLocation] = useState([-73.9664714, 40.8057752]);
  console.log('App rerendered.');

  console.log('Location fetching turned off!');
  // useEffect (() => {
  //   navigator.geolocation.getCurrentPosition((pos) => {
  //     const lon = pos.coords.longitude;
  //     const lat = pos.coords.latitude;
  //     setLocation([lon, lat]);
  //   });
  // }, []);

  return (
    <div className='App'>
        <NearbyStationsPage
          location={location}
        />
    </div>
  );
}

export default App;
