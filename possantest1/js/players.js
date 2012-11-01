
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

