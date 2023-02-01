const ProtoBuf = require('protobufjs');
const fs = require('fs');

const currentDir = __filename.split('/').slice(0,-1).join('/');

const gtfsRealtime = ProtoBuf.loadSync([currentDir, 'gtfs-realtime.proto'].join('/'));
fs.writeFile(
    [currentDir, 'gtfs-realtime.json'].join('/'),
    JSON.stringify(gtfsRealtime.toJSON(), null, 2),
    ((err) => {console.log(err)})
);

const nyctSubway = ProtoBuf.loadSync([currentDir, 'nyct-subway.proto'].join('/'));
fs.writeFile(
    [currentDir, 'nyct-subway.json'].join('/'),
    JSON.stringify(nyctSubway.toJSON(), null, 2),
    ((err) => {console.log(err)})
);

