
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
	if (newstate == this.meta['state'])
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
	console.log('GAMESTATES::peerEvent', event);
	if (event.type == 'game-change-state') {
		if (!this.initiator) {
			if (event.users)
				this.users = event.users;
			if (event.userstates)
				this.userstates = event.userstates;
			this._changeGameState(event.state);
		}
	}
	else if(event.type == 'game-set-meta') {
		if (event.user != this.user) {
			if (this.meta[event.key] != event.value) {
				this.meta[event.key] = event.value;
				this.onMetaChanged.fire(event.key);
	 		}
 		}
	}
}


GameStates.prototype.peerChangedState = function(user, state) {
	console.log('GAMESTATES::peerChangedState', user, state);
	if (this.users.indexOf(user) == -1)
		this.users.push(user);
	if (typeof(this.states[user]) == 'undefined')
		this.states[user] = '';
	if (this.states[user] == state)
		return;
	this.states[user] = state;
	if (initiator) {
		var query = this._getPreferredGameStateQuery(this.users, this.states);
		var newstate = this._getPreferredGameState(query);
		this._changeGameState(newstate);
	}
}

