//some of the HTML elements
var joinDiv = document.getElementById('joinDiv');
var roomDiv = document.getElementById('roomDiv');
var codeInput = document.getElementById('code');
var timeInput = document.getElementById('time');
var timeBufferInput = document.getElementById('timeBuffer');
var timeIncrementInput = document.getElementById('timeIncrement');
var t1h = document.getElementById('t1');
var t2h = document.getElementById('t2');
var pauseB = document.getElementById('pauseButton');
var codeH = document.getElementById('codeH');

//the room id
var code = 0;
//the room
var room = {};

//POST the creation request to server and open room div if successful
function create() {
    console.log('time: ' + timeInput.value);
    var data = {
        time: parseInt(timeInput.value),
        buffer: parseInt(timeBufferInput.value),
        increment: parseInt(timeIncrementInput.value),
    };
    $.post('./create',data,function(data,status) {
        if(data == 'invalid') {
            alert("Time must be between 1 and 740 minutes.");
            return;
        }
        if(data == 'err') {
            alert("Error, please refresh the page and try again.");
            return;
        }
        code = data;
        joinDiv.style.display = "none";
        roomDiv.style.display = "inline-block";
        codeH.innerHTML = "Code: " + code;
        setUpdateInterval();
    });
}

//try to get initial room info from code in input box
function join() {
    var id = codeInput.value;
    var data = {code: id};
    $.post('./info',data,function(data,status) {
        if(data == 'invalid') {
            console.log('failed room check with id ' + id)
            alert("Invalid Room Code.");
            console.log("failed room check with code " + code);
            alert('It appears this room no longer exists.');
        } else if(data == 'err') {
            alert("Error, please refresh the page and try again.");
        } else {
            room = data;
            code = id;
            joinDiv.style.display = "none";
            roomDiv.style.display = "inline-block";
            codeH.innerHTML = "Code: " + id;
            setUpdateInterval();
        }
    });
}

//switch which timer is counting down
function swap() {
    var data = {code, s: 0};
    room.activeBuffer = room.buffer; //just to keep the local update smooth
    $.post('./switch',data,function(data,status) {
        if(data == 'invalid') {
            alert("Invalid Room Code.");
            return false;
        }
        if(data == 'err') {
            alert("Error, please refresh the page and try again.");
            return false;
        }
        room = data;
        return true;
    });
}

//pause/unpause timer
function pause() {
    var s = 1;
    if(!room.p) {
        s = 2;
    }
    var data = {code, s};
    $.post('./switch',data,function(data,status) {
        if(data == 'invalid') {
            alert("Invalid Room Code.");
            return false;
        }
        if(data == 'err') {
            alert("Error, please refresh the page and try again.");
            return false;
        }
        room = data;
        return true;
    });
}   

//update the room display
function updateRoomDisplay() {
    var h1 = Math.floor(room.t1/3600);
    var m1 = Math.floor(room.t1/60)-h1*60;
    var s1 = Math.floor(room.t1)-h1*3600-m1*60;
    
    var hs1 = h1.toString();
    if(h1 < 10) {
        hs1 = "0" + hs1;
    }
    var ms1 = m1.toString();
    if(m1 < 10) {
        ms1 = "0" + ms1;
    }
    var ss1 = s1.toString();
    if(s1 < 10) {
        ss1 = "0" + ss1;
    }
    t1h.innerHTML = hs1 + ":" + ms1 + ":" + ss1;
    
    var h2 = Math.floor(room.t2/3600);
    var m2 = Math.floor(room.t2/60)-h2*60;
    var s2 = Math.floor(room.t2)-h2*3600-m2*60;
    var hs2 = h2.toString();
    if(h2 < 10) {
        hs2 = "0" + hs2;
    }
    var ms2 = m2.toString();
    if(m2 < 10) {
        ms2 = "0" + ms2;
    }
    var ss2 = s2.toString();
    if(s2 < 10) {
        ss2 = "0" + ss2;
    }
    t2h.innerHTML = hs2 + ":" + ms2 + ":" + ss2;


    if(room.m1) {
        t1h.style["text-decoration"] = "underline";
        t2h.style["text-decoration"] = "none";
    } else {
        t1h.style["text-decoration"] = "none";
        t2h.style["text-decoration"] = "underline";
    }

    if(room.t1 <=0 ) {
        t1h.style.color = "red";
    }
    if(room.t2 <= 0) {
        t2h.style.color = "red";
    }
}


//update room info from server every second
function setUpdateInterval() {
    var roomInfo = setInterval(function() {
        var data = {code};
        $.post('./info',data,function(data,status) {
            if(data == 'invalid') {
                alert("Invalid Room Code.");
                clearInterval(roomInfo);
                console.log("failed room check with code " + code);
                alert('It appears this room no longer exists.');
            } else if(data == 'err') {
                alert("Error, please refresh the page and try again.");
            } else {
                room = data;
            }
        });
        updateRoomDisplay();
    }, 1000);
}

//update room clock locally between server updates
var prevTime = performance.now();
setInterval(function() {
    let time = performance.now();
    let delta = (time-prevTime)/1000;
    // Check buffer before for local updates to avoid backwards ticks
    if (room && room.activeBuffer && room.activeBuffer > 0) {
        room.activeBuffer -= delta;
        delta = -1* room.activeBuffer; 
        if (delta < 0) {
            return;
        }
    }
    prevTime = time;
    if(room && !room.p) {
        if(room.m1 && room.t1 > 0) {
            room.t1 -= delta;
            updateRoomDisplay();
        } else if(!room.m1 && room.t2 > 0) {
            room.t2 -= delta;
            updateRoomDisplay();
        }
    }
}, 100);