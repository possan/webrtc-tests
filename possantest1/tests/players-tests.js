var q = QUnit;

function createPlayers(opts) {
	var localqueue = [];
	var netqueue = [];
	var tp = new Players(opts);
	
	tp.network.addListener(function(msg) {
		console.log('got network', msg);
		netqueue.push(msg);
	});
	
	tp.local.addListener(function(msg) {
		console.log('got local', msg);
		localqueue.push(msg);
	});
	tp.expectLocal = function(msg) {
		var l = localqueue.splice(0, 1);
		if (typeof msg !== 'undefined') {
			var popped = l[0];
			QUnit.deepEqual(popped, msg);
		}
	}
	tp.expectNet = function(msg) {
		var l = netqueue.splice(0, 1);
		if (typeof msg !== 'undefined') {
			var popped = l[0];
			QUnit.deepEqual(popped, msg);
		}
	}
	tp.expectNoNet = function(msg) {
		QUnit.equal(0, netqueue.length);
	}
	tp.expectNoLocal = function(msg) {
		QUnit.equal(0, localqueue.length);
	}
	return tp;
}




q.module("Player state manager");

/*
test("Empty on start", function() {
	var s = createPlayers();
	q.deepEqual(s.connectedUsers, []);
	q.deepEqual(s.readyUsers, []);
});

test("I am the first user / initiator", function() {
	stop();
	var s = createPlayers({ initiator: true, user: 'a' });
	q.deepEqual(s.connectedUsers, ['a']);
	s.expectNoLocal();
	s.expectNoNet();
	start();
});

test("Second user gets assigned user2", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'a' });
	s.handleNetwork({ type: 'peer-connect', user: 'bbb' });
	s.expectLocal({ type: 'peer-connected', user: 'bbb', gamestate: '' });
	s.expectNet({ type: 'peer-connected', user:'bbb', gamestate: '' });
	q.deepEqual(['a', 'bbb'], s.connectedUsers);
	s.expectNoLocal();
	s.expectNoNet();
	start();
});

test("Third user cannot join", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'a' });
	s.handleNetwork({ type:'peer-connect', user:'b' });
	s.expectLocal({ type:'peer-connected', user:'b', gamestate: '' });
	s.expectNet({ type:'peer-connected', user:'b', gamestate: '' });
	s.handleNetwork({ type:'peer-connect', user:'c' });
	s.expectNet({ type:'peer-rejected', user:'c' });
	q.deepEqual(['a', 'b'], s.connectedUsers);
	s.expectNoLocal();
	s.expectNoNet();
	start();
}); 

test("Only initiator can start game", function() {
	stop();
	var s = createPlayers({ initiator: false, user:'local', user1:'a', user2:'local' });
	// s.ready();
	s.handleNetwork({ type: 'peer-ready', user:'local' });
	s.start();
	// s.expectNet({ type: 'peer-ready', user: 'local' });
	// s.expectLocal({type: 'peer-start'});
	s.expectNoNet();
	start();
});

test("When initiator disconnects user2 becomes initiator", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'b', user1:'a', user2:'b' });
	q.equal(s.initiator, true);
	s.handleNetwork({type: 'peer-disconnected', user:'a'});
	s.expectLocal({type: 'become-initiator', user:'b'});
	s.expectNet({type: 'new-initiator', user:'b'});
	// q.equal(s.initiator, true);
	start();
});

test("Connected peers are registered", function() {
	stop();
	var s = createPlayers({ initiator: true, user: 'local' });
	s.connect();
	s.expectNet({ type:'peer-connected', user:'local' });
	s.handleNetwork({ type:'peer-connect', user:'remote' });
	s.expectNet({ type:'peer-connected', user:'remote', gamestate:'' });
	start();
});

test("Peers are marked as ready when peer-ready", function() {
	stop();
	var s = createPlayers({ initiator: true, user: 'local' });
	s.connect();
	s.expectLocal({ type:'connected', user: 'local' });
	s.expectNet({ type:'peer-connected', user: 'local' });
	q.deepEqual(s.connectedUsers, ['local']);
	s.handleNetwork({ type:'peer-connect', user: 'b' });
	s.expectLocal({ type:'peer-connected', user: 'b', gamestate:'' });
	s.expectNet({ type:'peer-connected', user: 'b', gamestate:'' });
	q.deepEqual(s.connectedUsers, ['local', 'b']);
	q.deepEqual(s.readyUsers, []);
	// both are connected,
	s.ready();
	// s.expectNet({type:'peer-ready', user:'local'});
	q.deepEqual(s.readyUsers, ['local']);
	s.handleNetwork({type:'peer-ready', user:'b'});
	q.deepEqual(s.readyUsers, ['local', 'b']);
	start();
});

test("Start signal is sent by initiator when both users are connected and ready", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'a' });
	q.deepEqual(s.connectedUsers, ['a']);
	s.handleNetwork({type:'peer-connect', user:'b'});
	s.expectLocal({type:'peer-connected', user:'b', gamestate:'' });
	s.expectNet({type:'peer-connected', user:'b', gamestate:'' });
	q.deepEqual(s.connectedUsers, ['a', 'b']);
	q.deepEqual(s.readyUsers, []);
	// both are connected,
	s.ready();
	s.handleNetwork({ type:'peer-ready', user: 'b' });
	q.deepEqual(s.readyUsers, ['a', 'b']);
	// both have sent ready messages.
	s.expectNet({ type: 'start', initiator: 'a' });
	s.expectLocal({ type: 'start', initiator: 'a' });
	start();
});

test("Start signal is not sent by non-initiator when both users are connected and ready", function() {
	stop();
	var s = createPlayers({ initiator: false, user:'b', user1:'a', user2:'b' });
	s.ready();
	s.handleNetwork({type:'peer-ready', user:'a'});
	// both have sent ready messages.
	s.expectNet({type:'peer-ready', user:'b'});
	s.expectNoLocal();
	start();
});

test("When users change state the initiator is updated", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'local', user1:'local', user2:'b' });
	s.handleNetwork({type:'peer-ready', user:'b'});
	// s.ready();
	// s.handleNetwork({type:'peer-ready', user:'a'});
	// both have sent ready messages.
	s.expectNet({type:'peer-ready', user:'b'});
	// s.expectNoLocal();
	start();
});

test("When initiator sets state it's sent over the network", function() {
	stop();
	var s = createPlayers({ initiator: true, user:'local', user1:'local', user2:'b' });
	s.setState('test');
	// s.handleNetwork({type:'peer-ready', user:'b'});
	// s.ready();
	// s.handleNetwork({type:'peer-ready', user:'a'});
	// both have sent ready messages.
	s.expectNet({ type: 'peer-set-state', user: 'b' });
	// s.expectNoLocal();
	start();
});

*/

test("Connect events are sent to network", function() {
	stop();
	var p = new PlayerStates({ user: 'user1' });
	p.onSendBroadcast = new Observable.Mocked();
	p.localConnect();
	p.onSendBroadcast.expect({ type: 'peer-connect', user: 'user1' });
	p.onSendBroadcast.expect(null);
	start();
});

test("Disconnect events are sent to network", function() {
	stop();
	var p = new PlayerStates({ user: 'user1' });
	p.onSendBroadcast = new Observable.Mocked();
	p.localDisconnect();
	p.onSendBroadcast.expect({ type: 'peer-disconnect', user: 'user1', _async: false });
	p.onSendBroadcast.expect(null);
	start();
});

test("Set state events are sent to network", function() {
	stop();
	var p = new PlayerStates({ user: 'user2' });
	p.onSendBroadcast = new Observable.Mocked();
	p.localSetState('x');
	p.onSendBroadcast.expect({ type: 'peer-change-state', user: 'user2', state: 'x', _broadcast: true });
	p.onSendBroadcast.expect(null);
	start();
});

test("Action events are sent to network", function() {
	stop();
	var p = new PlayerStates({ user: 'user5' });
	p.onSendBroadcast = new Observable.Mocked();
	p.localBroadcastEvent({ event: 'custom' });
	p.onSendBroadcast.expect({ type: 'peer-event', user: 'user5', event: { event: 'custom' }, _broadcast: true });
	p.onSendBroadcast.expect(null);
	start();
});



test("New peers get connected state and notifies listeners", function() {
	stop();
	var p = new PlayerStates({ user: 'user5' });
	p.onUserStateChanged = new Observable.Mocked();
	p.peerEvent({ type: 'peer-connect', user: 'user6' });
	p.onUserStateChanged.expect({ user: 'user6', state: 'connected', users: ['user6'], states:{'user6': 'connected'} });
	p.onUserStateChanged.expect(null);
	start();
});


test("Peers changing state notifies listeners", function() {
	stop();
	var p = new PlayerStates({ user: 'user5' });
	p.onUserStateChanged = new Observable.Mocked();
	p.peerEvent({ type: 'peer-connect', user: 'user6' });
	p.onUserStateChanged.expect();
	p.peerEvent({ type: 'peer-change-state', user: 'user6', state: 'apa' });
	p.onUserStateChanged.expect({ user: 'user6', state: 'apa', users: ['user6'], states:{'user6': 'apa'} });
	p.onUserStateChanged.expect(null);
	start();
});

test("Incoming action/event notifies listeners", function() {
	stop();
	var p = new PlayerStates({ user: 'user5' });
	p.onBroadcastEvent = new Observable.Mocked();
	p.peerEvent({ type: 'peer-event', event: { custom: 123 }, user: 'user6' });
	p.onBroadcastEvent.expect({ custom: 123 });
	p.onBroadcastEvent.expect(null);
	start();
});




















