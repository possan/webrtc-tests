/*

var g = new Game({
	initiator: false,
	playerstate: p
});

g->setStateCalculator(callback);
	given this list of states, what is the desired
	state for the entire game?

g->onLeaveState.listen(callback)
	// leaving state

g->onEnterState.listen(callback)
	// leaving state

g->localEvent(event);
	// post event to all other players

g->onEvent.listen(callback)
	// on incoming event







p->handlePeerEvent(event);
	{ type: 'peer-change-state', state: 'x', user: 'y' }


g->peerBroadcastSetState(state);
g->onStateChanged.listen(callback(g, newstate, oldstate));

g->peerBroadcastSetMeta(meta);
g->getMeta();
g->localSetMeta(meta);
g->onMetaChanged.listen(callback(g, meta));

g->localAction(action);
g->onAction.listen(callback(g, action));

g->localBroadcast(event);
g->onBroadcast.listen(callback(event));

*/


var GameStates = function(opts) {
	this.options = opts || {};
	this.state = this.options.state || '';
	this.stateCalculator = this.options.stateCalculator || undefined;
	this.users = this.options.users || [];
	this.states = {};
	this.onLeaveState = new Observable();
	this.onEnterState = new Observable();
	this.onGameEvent = new Observable();
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
	console.log('query', q);
	return q;
}

GameStates.prototype._getPreferredGameState = function(users, states) {
	var q = this._getPreferredGameStateQuery(users, states);
	if (this.stateCalculator)
		return this.stateCalculator(q);
	return '';
}

GameStates.prototype._changeGameState = function(newstate) {
	if (newstate == this.state)
		return;
	this.onLeaveState.fire({ state: this.state, nextstate: newstate });
	this.onEnterState.fire({ state: newstate, laststate: this.state });
	this.state = newstate;
}

GameStates.prototype.peerChangedState = function(user, state) {
	if (this.users.indexOf(user) == -1)
		this.users.push(user);
	if (typeof(this.states[user]) == 'undefined')
		this.states[user] = '';
	if (this.states[user] == state)
		return;
	this.states[user] = state;
	var newstate = this._getPreferredGameState(this.users, this.states);
	this._changeGameState(newstate);
}

