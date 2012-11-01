/*

var p = new Players({
	maxplayers: 2,
	initiator: false,
	user: 'local userid'
});

// p->peerConnected(peer);
// p->peerDisconnected(peer);
// p->peerChangeStated(peer, state);
// p->peerChangeStated(peer, state);

p->onSendBroadcast.listen(callback);
	// callback for every outgoing message...

p->onUserStateChanged.listen(callback);
	// any users's state changed

p->onBroadcastEvent.listen(callback);
	// on incoming broadcast event

skicka in ett randomseed per rum in i rummet

*/

var PlayerStates = function(opts) {
	this.options = opts || {};
	this.user = this.options.user || '';
	this.users = this.options.users || [];
	this.states = this.options.states || {};
	this.onSendBroadcast = new Observable();
	this.onUserStateChanged = new Observable();
	this.onBroadcastEvent = new Observable();
};

/*
p->localConnect();
	{ type: 'peer-connect', user: ME, broadcast: false }
*/
PlayerStates.prototype.localConnect = function() {
	console.log('PLAYERSTATES::localConnect');
	this.onSendBroadcast.fire({
		type: 'peer-connect',
		user: this.user,
		_broadcast: true
	});
}

/*
p->localDisconnect();
	{ type: 'peer-disconnect', user: ME, broadcast: false } (synchronous)
*/
PlayerStates.prototype.localDisconnect = function() {
	console.log('PLAYERSTATES::localDisconnect');
	this.onSendBroadcast.fire({
		type: 'peer-disconnect',
		user: this.user,
		_broadcast: true,
		_async: false
	});
}

/*
p->localSetState(state);
	{ type: 'peer-change-state', state: state, user: ME, broadcast: true }
*/
PlayerStates.prototype.localSetState = function(state) {
	console.log('PLAYERSTATES::localSetState');
	this.onSendBroadcast.fire({
		type: 'peer-change-state',
		user: this.user,
		state: state,
		_broadcast: true
	});
}

/*
p->localBroadcastEvent(event);
	{ type: 'peer-event', event: event, user: ME, broadcast: true }
*/
PlayerStates.prototype.localBroadcastEvent = function(event) {
	console.log('PLAYERSTATES::localBroadcastEvent', event);
	this.onSendBroadcast.fire({
		type: 'peer-event',
		user: this.user,
		event: event,
		_broadcast: true
	});
}

/*

p->handlePeerEvent(event);

incoming peer events:
	{ type: 'peer-connect', user: 'remote1' }
	{ type: 'peer-disconnect', user: 'remote2' }
	{ type: 'peer-change-state', state: 'ready', user: 'remote2' }
	{ type: 'peer-change-state', state: 'paused', user: 'remote2' }

incoming game events:
	{ type: 'game-change-state', state: 'started' }
	{ type: 'game-event', event: { ... } }

*/

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
	console.log('PLAYERSTATES::peerEvent', event);
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
	}
};







/*


















p1 = new Players({ user: 'a', initiator: true });
p2 = new Players({ user: 'b', initiator: false });

p2 !initiator -> peer-connected -> p1

p1 -> peer-ready, you're host -> p1
p1 -> peer-ready, you're not host -> p2

p1 -> bye -> *

* -> bye -> p2 - become host

*/

var Players = function(opts) {
	this.options = opts || {};
	this.maxplayers = this.options.maxplayers || 2;
	this.user = this.options.user || '';
	this.initiator = this.options.initiator || false;
	this.users = [];
	this.gameState = '';
	this.userStates = {};
	this.connectedUsers = this.options.connectedUsers || [];
	if (this.options.user1 || this.options.user2) {
		if (this.options.user1)
			this.connectedUsers.push(this.options.user1);
		if (this.options.user2)
			this.connectedUsers.push(this.options.user2);
	}
	else if (this.user && this.user != '')
		this.connectedUsers.push(this.user);
	this.readyUsers = [];
	this.network = new Observable();
	this.local = new Observable();
	this.started = this.options.started || false;
	this.paused = false;
	this.startWhenReady = true;
	if (this.options.initiator)
		this.user1 = this.user;
	// else
	//	this.user2 = this.user;
	console.log('Players::construct()', this);
};

Players.PEER_CONNECTED = 'peer-connected';

Players.prototype._handleLocal = function(msg) {
	console.log('Players::handleLocal', msg);
	// handle incoming message
	switch (msg.type) {

		case 'connect':
			if (this.initiator) {
				var pos = this.connectedUsers.indexOf(msg.user);
				if (pos == -1 && this.connectedUsers.length >= this.maxplayers) {
					this.network.fire({ type: 'peer-rejected', user: msg.user });
				} else {
					if (pos == -1) {
						this.connectedUsers.push(msg.user);
						this.userState[msg.user] = 'connected';
					}
					// this.user2 = msg.user;
					this.local.fire({ type: 'connected', user: msg.user });
					this.network.fire({ type: 'peer-connected', user: msg.user });
				}
 			} else {
				this.network.fire({ type: 'peer-connect', user: msg.user });
 			}
			break;

		case 'set-game-state':
			if (this.initiator) {
				this.local.fire({ type: 'set-game-state', user: msg.user });
				this.network.fire({ type: 'set-game-state', user: msg.user, gamestate: this.gameState });
			}
		 	break;

		case 'set-state':
			if (this.initiator) {
				var pos = this.connectedUsers.indexOf(msg.user);
				if (pos == -1 && this.connectedUsers.length >= this.maxplayers) {
					this.network.fire({ type: 'peer-rejected', user: msg.user });
				} else {
					if (pos == -1) {
						this.connectedUsers.push(msg.user);
						this.userState[msg.user] = 'connected';
					}
					// this.user2 = msg.user;
					this.local.fire({ type: 'peer-set-state', user: msg.user });
					this.network.fire({ type: 'peer-set-state', user: msg.user, state: msg.state });
				}
 			} else {
				this.network.fire({ type: 'peer-set-state', user: msg.user, state: msg.state });
			}
			break;

		case 'ready':
			if (this.initiator) {
				if (this.readyUsers.indexOf(msg.user) == -1)
					this.readyUsers.push(msg.user);
				if (this.readyUsers.length == this.connectedUsers.length &&
					this.readyUsers.length > 1 ) {
					this.started = true;
					this.local.fire({ type: 'start', initiator: this.user });
					this.network.fire({ type: 'start', initiator: this.user });
				}
			} else {
				this.network.fire({ type: 'peer-ready', user: this.user });
			}
			break;

		case 'not-ready':
			if (this.initiator) {
				var idx2 = this.connectedUsers.indexOf(msg.user);
				if (idx2 != -1)
					this.readyUsers.splice(idx2, 1);
				// when app peers are ready, send 'ready' to local (and remote if we're initiator)
			} else {
				this.network.fire({ type: 'peer-not-ready', user: this.user });
			}
			break;


		case 'disconnect':
			if (this.initiator) {
				// other peer disconnected, make us initiator in the future.
				var idx2 = this.connectedUsers.indexOf(msg.user);
				if (idx2 != -1)
					this.connectedUsers.splice(idx2, 1);
				var idx = this.readyUsers.indexOf(msg.user);
				if (idx != -1)
					this.readyUsers.splice(idx, 1);
				if (this.connectedUsers[0] == this.user) {
					this.initiator = true
					this.local.fire({
						type: 'become-initiator',
						user: this.connectedUsers[0]});
					this.network.fire({
						type: 'new-initiator',
						user: this.connectedUsers[0]});
				}
			} else {
				this.network.fire({ type: 'peer-disconnect', user: this.user });
			}
			break;

		case 'bye':
		case 'peer-disconnected':
			if (this.initiator) {
				// other peer disconnected, make us initiator in the future.
				var idx2 = this.connectedUsers.indexOf(msg.user);
				if (idx2 != -1)
					this.connectedUsers.splice(idx2, 1);
				var idx = this.readyUsers.indexOf(msg.user);
				if (idx != -1)
					this.readyUsers.splice(idx, 1);
				if (this.connectedUsers[0] == this.user) {
					if (this.started) {
						this.local.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.network.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.started = false;
					}
					this.initiator = true
					this.local.fire({
						type: 'become-initiator',
						user: this.connectedUsers[0]});
					this.network.fire({
						type: 'new-initiator',
						user: this.connectedUsers[0]});
				}
			} else {
				if (this.connectedUsers.length == 1) {
					if (this.started) {
						this.local.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.network.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.started = false;
					}
					this.initiator = true
					this.local.fire({
						type: 'become-initiator',
						user: this.connectedUsers[0]});
					this.network.fire({
						type: 'new-initiator',
						user: this.connectedUsers[0]});
				}
			}
			break;

		case 'pause':
			if (this.initiator) {
				this.started = false;
	 			this.network.fire({type:'pause'});
		 		this.local.fire({type:'pause'});
			}
			else {
		 		this.local.fire({type:'peer-pause'});
			}
			break;

		case 'start':
		 	if (this.initiator) {
		 		if (this.readyUsers.length == this.connectedUsers.length) {
		 			this.network.fire({type:'start'});
		 			this.local.fire({type:'start'});
		 			this.started = true;
		 		} else {
			 		this.local.fire({type:'not-ready'});
		 		}
		 	}
			break;
	}}

Players.prototype.handleNetwork = function(msg) {
	console.log('Players::handleNetwork', msg);
	// handle incoming message
	switch (msg.type) {

		case 'peer-connect':
			if (this.initiator) {
				var pos = this.connectedUsers.indexOf(msg.user);
				if (pos == -1 && this.connectedUsers.length >= this.maxplayers) {
					this.network.fire({ type: 'peer-rejected', user: msg.user });
				} else {
					if (pos == -1)
						this.connectedUsers.push(msg.user);
					// this.user2 = msg.user;
					this.local.fire({ type: 'peer-connected', user: msg.user, gamestate: this.gameState });
					this.network.fire({ type: 'peer-connected', user: msg.user, gamestate: this.gameState });
				}
 			}
			break;

		case 'peer-connected':
			if (msg.user == this.user) {
				this.local.fire({ type: 'connected', user: msg.user });
				if (msg.gamestate)
					this.gameState = msg.gamestate;
			}
			break;

		case 'peer-changed-state':
			this.userStates[msg.user] = msg.state;
			if (this.initiator) {
				// i'm initiator, send state change...
				var allstates = [];
				for (var i=0; i<this.connectedUsers.length; i++) {
					var user = this.connectedUsers[i];
					allstates.push(this.userStates[user]);
				}
				this.local.fire({ type: 'user-states-changed', user: msg.user, allstates: states });
				// this.local.fire({ type: 'game-changed-state', user: msg.user });
			}
			break;

		case 'peer-ready':
			if (this.initiator) {
				if (this.readyUsers.indexOf(msg.user) == -1)
					this.readyUsers.push(msg.user);

				if (this.readyUsers.length == this.connectedUsers.length &&
					this.readyUsers.length > 1 ) {
					this.started = true;
					this.local.fire({ type: 'start', initiator: this.user });
					this.network.fire({ type: 'start', initiator: this.user });
				}
			}
			break;

		case 'peer-not-ready':
			if (this.initiator) {
				var idx2 = this.connectedUsers.indexOf(msg.user);
				if (idx2 != -1)
					this.readyUsers.splice(idx2, 1);
				// when app peers are ready, send 'ready' to local (and remote if we're initiator)
			}
			break;

		case 'bye':
		case 'disconnect':
		case 'peer-disconnected':
			if (this.initiator) {
				// other peer disconnected, make us initiator in the future.
				var idx2 = this.connectedUsers.indexOf(msg.user);
				if (idx2 != -1)
					this.connectedUsers.splice(idx2, 1);
				this.userStates[msg.user] = 'disconnected';
				var idx = this.readyUsers.indexOf(msg.user);
				if (idx != -1)
					this.readyUsers.splice(idx, 1);
				if (this.connectedUsers[0] == this.user) {
					if (this.started) {
						this.local.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.network.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.started = false;
					}
					this.initiator = true
					this.local.fire({
						type: 'become-initiator',
						user: this.connectedUsers[0]});
					this.network.fire({
						type: 'new-initiator',
						user: this.connectedUsers[0]});
				}
			} else {
				if (this.connectedUsers.length == 1) {
					if (this.started) {
						this.local.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.network.fire({
							type: 'pause',
							user: this.connectedUsers[0]});
						this.started = false;
					}
					this.initiator = true
					this.local.fire({
						type: 'become-initiator',
						user: this.connectedUsers[0]});
					this.network.fire({
						type: 'new-initiator',
						user: this.connectedUsers[0]});
				}
			}
			break;

		case 'pause':
			if (this.initiator) {
				this.started = false;
	 			this.network.fire({type:'pause'});
		 		this.local.fire({type:'pause'});
			}
			else {
		 		this.local.fire({type:'pause'});
			}
			break;

		case 'peer-start':
			// a peer wants to start
			break;

		case 'start':
		 	if (!this.initiator) {
		 		this.local.fire({type:'start'});
		  }
			break;
	}
}


// helpers

Players.prototype.setState = function(newstate) {
	this._handleLocal({ type:'set-state', user:this.user, state:newstate });
}

Players.prototype.connect = function() {
	this._handleLocal({ type:'connect', user:this.user });
}

Players.prototype.disconnect = function() {
	this._handleLocal({ type:'disconnect', user:this.user });
}

Players.prototype.start = function() {
	this._handleLocal({ type:'start', user:this.user });
}

Players.prototype.resume = function() {
	this._handleLocal({ type:'resume', user:this.user });
}

Players.prototype.pause = function() {
	this._handleLocal({ type:'pause', user:this.user });
}

Players.prototype.ready = function() {
	this._handleLocal({ type:'ready', user:this.user });
}

Players.prototype.notReady = function() {
	this._handleLocal({ type:'not-ready', user:this.user });
}

Players.prototype.broadcast = function(msg) {
	var msg2 = msg;
	msg2.broadcast = true;
	this.network.fire(msg);
}

Players.prototype.toPeers = function(msg) {
	var msg2 = msg;
	if (msg2.broadcast)
		delete msg2.broadcast;
	this.network.fire(msg);
}


