
var Observable = function() {
  this.listeners = [];
  this.keylisteners = {};
}

Observable.prototype.listen = function(callback) {
  this.listeners.push(callback);
}

Observable.prototype.addListener = function(callback) {
  this.listeners.push(callback);
}

Observable.prototype.fire = function(event) {
  for (var i=0; i<this.listeners.length; i++)
    this.listeners[i](event);
  if (event.type) {
  	if (this.keylisteners[event.type])
	  	for (var i=0; i<this.keylisteners[event.type].length; i++)
  		  this.keylisteners[event.type][i](event);
  }
}

Observable.prototype.on = function(event, callback) {
	if (typeof(this.keylisteners[event]) === 'undefined')
		this.keylisteners[event] = [];
	this.keylisteners[event].push(callback);
}

Observable.Mocked = function() {
  this.queue = [];
}

Observable.Mocked.prototype.fire = function(event) {
  this.queue.push(event);
}

Observable.Mocked.prototype.expect = function(event) {
  if (typeof event !== 'undefined') {
    if (event === null) {
      QUnit.equal(this.queue.length, 0);
    } else {
      var l = this.queue.splice(0, 1);
      var popped = l[0];
      QUnit.deepEqual(popped, event);
    }
  } else {
    // ignore event, just pop
    var l = this.queue.splice(0, 1);
  }
}

















var PlayerStates = function(opts) {
	this.options = opts || {};
	this.user = this.options.user || '';
	this.users = this.options.users || [];
	this.states = this.options.states || {};
	this.onSendBroadcast = new Observable();
	this.onUserStateChanged = new Observable();
	this.onBroadcastEvent = new Observable();
};

PlayerStates.prototype.localConnect = function() {
	console.log('PLAYERSTATES::localConnect');
	this.onSendBroadcast.fire({
		type: 'peer-connect',
		user: this.user,
		_broadcast: true
	});
}

PlayerStates.prototype.localDisconnect = function() {
	console.log('PLAYERSTATES::localDisconnect');
	this.onSendBroadcast.fire({
		type: 'peer-disconnect',
		user: this.user,
		_broadcast: true,
		_async: false
	});
}

PlayerStates.prototype.localSetState = function(state) {
	console.log('PLAYERSTATES::localSetState');
	this.onSendBroadcast.fire({
		type: 'peer-change-state',
		user: this.user,
		state: state,
		_broadcast: true
	});
}

PlayerStates.prototype.localSetMeta = function(key, value) {
	console.log('PLAYERSTATES::localSetMeta', key, value);
	this.onSendBroadcast.fire({
		type: 'game-set-meta',
		user: this.user,
		key: key,
		value: value,
		_broadcast: true
	});
}

PlayerStates.prototype.localBroadcastEvent = function(event) {
	console.log('PLAYERSTATES::localBroadcastEvent', event);
	this.onSendBroadcast.fire({
		type: 'peer-event',
		user: this.user,
		event: event,
		_broadcast: true
	});
}

PlayerStates.prototype._setState = function(user, state) {
	console.log('PLAYERSTATES::_setState', user, state);
	if (this.users.indexOf(user) == -1)
		this.users.push(user);
	if (this.states[user] == state)
		return;
 	this.states[user] = state;
	// change event!
	this.onUserStateChanged.fire({
		user: user,
		state: state,
		users: this.users,
		states: this.states
	});
}

PlayerStates.prototype.peerEvent = function(event) {
	switch(event.type) {
		case 'peer-connect':
			this._setState(event.user, 'connected');
			break;
		case 'peer-disconnect':
			this._setState(event.user, 'disconnected');
			break;
		case 'peer-change-state':
			this._setState(event.user, event.state);
			break;
		case 'peer-event':
			this.onBroadcastEvent.fire(event.event);
			break;
		default:
			console.log('PLAYERSTATES::peerEvent unhandled event:', event);
			break;
	}
};

















var GameStates = function(opts) {
	this.options = opts || {};
	this.user = this.options.user || '';
	this.initiator = this.options.initiator || false;
	// this.state = this.options.state || '';
	this.stateCalculator = this.options.stateCalculator || undefined;
	this.users = this.options.users || [];
	this.states = {};
	this.meta = this.options.meta || {};
	this.onLeaveState = new Observable();
	this.onEnterState = new Observable();
	this.onMetaChanged = new Observable();
	this.onSendBroadcast = new Observable();
}

GameStates.prototype.setStateCalculator = function(callback) {
	this.stateCalculator = callback;
}

GameStates.prototype._getPreferredGameStateQuery = function(users, states) {
	var statelist = [],
			uniquelist = [];
	for (var i=0; i<users.length; i++) {
		var us = users[i];
		var st = states[us] || '';
		statelist.push(st);
		if (uniquelist.indexOf(st) == -1)
			uniquelist.push(st);
	};
	var q = {
		users: users,
		userstates: states,
		states: statelist,
		unique: uniquelist,
		all: (uniquelist.length == 1) ? uniquelist[0] : ''
	};
	console.log('GAMESTATES::_getPreferredGameStateQuery query', q);
	return q;
}

GameStates.prototype._getPreferredGameState = function(query) {
	if (this.stateCalculator)
		return this.stateCalculator(query);
	return '';
}

GameStates.prototype._changeGameState = function(newstate) {
	console.log('GAMESTATES::_changeGameState', newstate, 'from', this.state);
	if (newstate === this.meta['state'])
		return;
	this.onLeaveState.fire({ state: this.state, nextstate: newstate });
	this.onEnterState.fire({ state: newstate, laststate: this.state });
	this.meta['state'] = newstate;
	if (this.initiator) {
		this.onSendBroadcast.fire({
			type: 'game-change-state',
			state: newstate,
			users: this.users,
			userstates: this.userstates
		});
		this.onSendBroadcast.fire({
			type: 'game-set-meta',
			key: 'state',
			value: newstate
		});
	}
}

GameStates.prototype.peerEvent = function(event) {
	if (event.type == 'game-change-state') {
		console.log('GAMESTATES::peerEvent change state:', event);
		if (!this.initiator) {
			if (event.users)
				this.users = event.users;
			if (event.userstates)
				this.userstates = event.userstates;
			this._changeGameState(event.state);
		}
	}
	else if(event.type == 'game-set-meta') {
		console.log('GAMESTATES::peerEvent set meta:', event);
		if (event.user != this.user) {
			if (this.meta[event.key] != event.value) {
				this.meta[event.key] = event.value;
				this.onMetaChanged.fire(event.key);
	 		}
 		}
	} else {
		console.log('GAMESTATES::peerEvent unhandled event:', event);
	}
}


GameStates.prototype.peerChangedState = function(user, state) {
	console.log('GAMESTATES::peerChangedState', user, state);
	if (this.users.indexOf(user) == -1)
		this.users.push(user);
	if (typeof(this.states[user]) === 'undefined')
		this.states[user] = '';
	if (this.states[user] == state)
		return;
	console.log('user=' + user);
	console.log('state=' + state);
	this.states[user] = state;
	if (initiator) {
		var query = this._getPreferredGameStateQuery(this.users, this.states);
		var newstate = this._getPreferredGameState(query);
		this._changeGameState(newstate);
	}
}
















var COMM = {
  listener: null,
  socket: null,
  ready: false,
  observable: new Observable()
};

COMM.connect = function(token, roomkey) {
  COMM.token = token;
  COMM.room = roomkey;
  COMM.observable.fire({type: 'connecting'});
  console.log('COMM Opening channel...');
  var channel = new goog.appengine.Channel(token);
  var handler = {
    'onopen': function() {
      COMM.ready = true;
      COMM.observable.fire({type: 'connected', user: '{{ me }}'});
    },
    'onmessage': function(message) {
      var data = JSON.parse(message.data);
      // console.log('incoming message', message);
      // console.log('COMM S->C:', data);
      COMM.observable.fire({type: 'message', message: data});
    },
    'onerror': function() {
      console.log('COMM Channel error.');
      COMM.observable.fire({type: 'error'});
    },
    'onclose': function() {
      console.log('COMM Channel closed.');
      COMM.observable.fire({type: 'closed'});
      COMM.ready = false;
    }
  };
  COMM.socket = channel.open(handler);
}

COMM.listen = function(listener) {
  COMM.observable.listen(listener);
}

COMM.disconnect = function() {
  console.log('COMM Disconnecting...');
  COMM.observable.fire({type: 'disconnecting'});
  COMM.socket.close();
}

COMM.send = function(message) {
  // console.log('COMM C->S:', message);
  var msgString = JSON.stringify(message);
  path = '/message?r='+encodeURIComponent(COMM.room);
  var xhr = new XMLHttpRequest();
  if (typeof(message._async) !== 'undefined' && !message._async)
    xhr.open('POST', path, false);
  else
    xhr.open('POST', path, true);
  xhr.send(msgString);
}

























var pc;
// var isRTCPeerConnection = true;

var PEER = {
  listener: null,
  ready: false,
  previouslyConnected: false,
  observable: new Observable()
};

PEER.connect = function(pc_config) {
  pc = null;
  PEER.ready = false;
  console.log('PEER: connect...');
  console.log('pc_config', pc_config);
  PEER.observable.fire({type:'connecting'});
  try {
    PEER.observable.fire({type:'trying', type:1});
    // try method 1


    pc = new webkitRTCPeerConnection(pc_config);
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        PEER.observable.fire({
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      } else {
        console.log("End of candidates.");
      }
    };
    PEER.ready = true;
    isRTCPeerConnection = true;
    console.log("Created webkitRTCPeerConnnection with config \"" +
        JSON.stringify(pc_config) + "\".");
/*


      var stun_server = "";
      if (pc_config.iceServers.length !== 0) {
        stun_server = pc_config.iceServers[0].url.replace('stun:', 'STUN ');
      }
      pc = new webkitRTCPeerConnection(stun_server, function(candidate, moreToFollow) {
        if (candidate) {
          PEER.observable.fire({
            type: 'candidate',
            label: candidate.label,
            candidate: candidate.toSdp()
          });
        }
        if (!moreToFollow) {
          console.log("End of candidates.");
        }
      });
      PEER.ready = true;
      isRTCPeerConnection = false;

*/










  } catch (e) {
    /*
    try {
      PEER.observable.fire({type:'trying', type:2});
      // try second method












    pc = new webkitRTCPeerConnection(pc_config);
    pc.onicecandidate = function(event) {
      if (event.candidate) {
        PEER.observable.fire({
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      } else {
        console.log("End of candidates.");
      }
    };
      isRTCPeerConnection = true;
    console.log("Created webkitRTCPeerConnnection with config \"" + JSON.stringify(pc_config) + "\".");















      console.log("Created webkitPeerConnnection00 with config \"" + stun_server + "\".");
    } catch (e) { */
      // give up.
      console.log("Failed to create PeerConnection, exception: " + e.message);
      // alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
      PEER.observable.fire({type:'failed'});
      return;
    // }
  }

  if(pc) {
    pc.onconnecting = function(message) {
      console.log("PEER: Session connecting.");
      // PEER.observable.fire({type:'connecting'});
    };

    pc.onopen = function(message) {
      console.log("PEER: Session opened.");
    };

    pc.onaddstream = function(event) {
      var url = webkitURL.createObjectURL(event.stream);
      console.log("PEER: Remote stream added.");
      PEER.observable.fire({type:'add-stream', url:url, stream:event.stream});
    };

    pc.onremovestream = function(event) {
      console.log("PEER: Remote stream removed.");
      // PEER.observable.fire({type:'remove-stream'});
    };
  }
}

PEER.listen = function(listener) {
  PEER.observable.listen(listener);
}

PEER.gotAnswer = function(msg) {
  console.log('Peer sent answer.', msg);
  // if (isRTCPeerConnection) {
  if (PEER.ready)
    pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: msg.sdp
    }));
  else
    console.log('unable to add candidate, peer connection not ready.');
  //} else {
  //  pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(msg.sdp));
  //}
}

PEER.addCandidate = function(msg) {
  // console.log('PEER addcandidate', msg);
  // if (isRTCPeerConnection) {
  // var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label, candidate:msg.candidate});
  if (PEER.ready) {
    PEER.previouslyConnected = true;
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: msg.label,
      candidate: msg.candidate
    });
    try {
      pc.addIceCandidate(candidate);
    } catch(e) {
      console.error(e);
    }
  } else
    console.log('unable to add candidate, peer connection not ready.');
  //} else {
  //  var candidate = new IceCandidate(msg.label, msg.candidate);
  //  pc.processIceMessage(candidate);
  // }
}

PEER.gotOffer = function(msg) {
  console.log("PEER: gotOffer", msg);
  // We only know JSEP version after createPeerConnection().
  if (msg.sdp != '') {
    // if (!isRTCPeerConnection)
    //   pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(msg.sdp));
    // else
    if (PEER.ready)
      pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: msg.sdp
      }));
    else
      console.log('unable to set remote description, peer connection not ready.');
  }
}

function setLocalAndSendMessage(sessionDescription) {
  console.log('setLocalAndSendMessage', sessionDescription);
  pc.setLocalDescription(sessionDescription);
  COMM.send(sessionDescription);
}

var mediaConstraints = {'has_audio':true, 'has_video':true};

PEER.createOffer = function() {
  var sdp = '';
  console.log("PEER: createOffer");
  // if (isRTCPeerConnection) {
  if (PEER.ready)
    pc.createOffer(setLocalAndSendMessage, null, mediaConstraints);
  else
    console.log('unable to create offer, peer connection not ready.');
  // } else {
  //   var offer = pc.createOffer(mediaConstraints);
  //  pc.setLocalDescription(pc.SDP_OFFER, offer);
  //  sdp = offer.toSdp();
  //  pc.startIce();
  // }
  return sdp;
}

PEER.createAnswer = function() {
  var sdp = '';
  console.log("PEER: createAnswer");
 // if (isRTCPeerConnection) {
  if (PEER.ready)
    pc.createAnswer(setLocalAndSendMessage, null, mediaConstraints);
  else
    console.log('unable to create answer, peer connection not ready.');
 /* } else {
    var offer = pc.remoteDescription;
    var answer = pc.createAnswer(offer.toSdp(), mediaConstraints);
    console.log('pc', pc);
    pc.setLocalDescription(pc.SDP_ANSWER, answer);
    sdp = answer.toSdp();
    pc.startIce();
  } */
  return sdp;
}

PEER.startStreaming = function(str) {
  console.log("PEER: Start streaming; Adding local stream.", str, PEER.ready);
  if (PEER.ready)
    pc.addStream(str);
}

PEER.disconnect = function() {
  PEER.ready = false
  if (pc != null) {
    pc.close();
    pc = null;
  }
}



















var CAMERA = {
  observable: new Observable(),
  stream: null
};

CAMERA.listen = function(listener) {
  CAMERA.observable.listen(listener);
}

CAMERA.connect = function() {
  // CAMERA.observable.fire({type: 'failed'});
  // return;
  CAMERA.disconnect();

  function onUserMediaSuccess(stream) {
    console.log("User has granted access to local media.");
    var url = webkitURL.createObjectURL(stream);
    CAMERA.observable.fire({type:'connected', stream:stream, url:url});
    CAMERA.stream = stream;

    // create peer connection here!
  }

  function onUserMediaError(error) {
    console.log("Failed to get access to local media. Error code was " + error.code);
    // alert("Failed to get access to local media. Error code was " + error.code + ".");
    CAMERA.observable.fire({type: 'failed'});
  }

  CAMERA.observable.fire({type:'connecting'});
  if (noLocalVideo == 1) {
    console.log('Skipping local video');
    CAMERA.observable.fire({type: 'failed'});
  } else {
    try {
      // try method 1
      console.log('Requesting access to camera, method 1...');
       navigator.webkitGetUserMedia({'audio':true, 'video':true}, onUserMediaSuccess, onUserMediaError);
      console.log("Requested access to local media with new syntax.");
    } catch (e) {
      try {
        // try method 2
        console.log('Requesting access to camera, method 2...');
         navigator.webkitGetUserMedia("video,audio", onUserMediaSuccess, onUserMediaError);
        console.log("Requested access to local media with old syntax.");
      } catch (e) {
        // alert("webkitGetUserMedia() failed. Is the MediaStream flag enabled in about:flags?");
        console.log("webkitGetUserMedia failed with exception: " + e.message);
        CAMERA.observable.fire({type: 'failed'});
      }
    }
  }
}

CAMERA.disconnect = function() {
  if (CAMERA.stream != null) {
    CAMERA.stream.stop();
    CAMERA.observable.fire({type: 'disconnected'});
    CAMERA.stream = null;
  }
}




