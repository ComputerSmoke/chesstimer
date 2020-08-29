//dependencies
var express = require('express');
var app = express();
var serv = require('http').Server(app);
const axios = require('axios');
const bodyParser = require('body-parser');


//store room info
var rooms = {};

//listen on http port 2200
serv.listen(2200);
console.log('started');
//serve home file
app.get('/',async function(req, res) {
    res.sendFile(__dirname+'/client/index.html');
});
app.use('/client',express.static(__dirname+'/client'));
app.use(bodyParser.urlencoded({extended: true}));

//respond to room creation requests
app.post('/create',async function(req,res) {
    console.log('got post');
    try {
        if(!req || !req.body) return;
        var data = req.body;
        if(typeof data.time != 'string' || !parseInt(data.time) || data.time < 1 || data.time > 740) {
            res.send('invalid');
            console.log('got num of type: ' + typeof data.time);
            return;
        }
        data.time = parseInt(data.time)*60;
        var code = Math.floor(100000 + Math.random() * 900000).toString();
        while(rooms[code]) {
            code = Math.floor(100000 + Math.random() * 900000).toString();
        }
        let buffer = parseInt(data.buffer) || 0
        rooms[code] = {t1: data.time, 
            t2: data.time, 
            buffer: buffer, 
            activeBuffer: buffer,
            increment: parseInt(data.increment) || 0,
            m1: true, 
            p: true, 
            t: 0
        };

        res.send(code);
    } catch(e) {
        console.error(e);
        res.send('err');
    }
});

//respond to room info requests
app.post('/info',async function(req,res) {
    if(!req || !req.body) return;
    var data = req.body;
    if(!roomExists(data.code)) {
        console.log('room with code' + data.code + 'did not exist');
        res.send("invalid");
        return;
    }
    res.send(rooms[data.code]);
});

//respond to switch/start/stop timer requests
app.post('/switch',async function(req, res) {
    if(!req || !req.body) return;
    var data = req.body;
    if(!roomExists(data.code)) {
        res.send('invalid');
        return;
    }
    var room = rooms[data.code];
    if(data.s == 0) {
        //apply increment
        if (room.m1) {
            room.t1 += room.increment;
        } else {
            room.t2 += room.increment;
        }
        //switch
        room.m1 = !room.m1;
        //reset buffer TODO: (Should this also happen on unpause?)
        room.activeBuffer = room.buffer;
    } else if(data.s == 1) {
        //pause
        room.p = false;
    } else if(data.s == 2) {
        //unpause
        room.p = true;
    }
    res.send(room);
});

//reduce room timer value
function roomTick(delta, room) {
    if(room.p) return;
    if (room.activeBuffer > 0) {
        room.activeBuffer -= delta;
        delta = -1* room.activeBuffer; 
        if (delta < 0) {
            return;
        }
    }
    if(room.m1 && room.t1 > 0) {
        room.t1 -= delta;
    } else if(room.t2 > 0) {
        room.t2 -= delta;
    }
}

//countdown on rooms
var prevTime = process.hrtime()[0]*1e9+process.hrtime()[1];
setInterval(function() {
    var time = process.hrtime()[0]*1e9+process.hrtime()[1];
    var delta = (time-prevTime)/1e9;
    prevTime = time;
    
    var roomArray = Object.keys(rooms);
    for(var i = 0; i < roomArray.length; i++) {
        var room = rooms[roomArray[i]];
        roomTick(delta, room);
    }
}, 500);

//remove rooms after 24-48 hours
setInterval(function() {
    var roomArray = Object.keys(rooms);
    for(var i = 0; i < roomArray.length; i++) {
        var room = rooms[roomArray[i]];
        if(room.t == 0) {
            room.t++;
        } else {
            delete[room];
        }
    }
},86400000);

//validate room exists given code
function roomExists(code) {
    try {
        console.log("checking if room with code: " + code + " exists");
        console.log(rooms[code]);
        if(code == null || code == undefined || typeof code != 'string' || !rooms[code]) {
            console.log("it's bad");
            return false;
        }
        console.log("it's good");
        return true;
    } catch(e) {
        console.error(e);
        return false;
    }
}