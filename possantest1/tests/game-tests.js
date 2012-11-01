var q = QUnit;

q.module("Game states");

test("Can't calculate state without callback", function() {
	var g = new GameStates();
	var state = g._getPreferredGameState(['a', 'b'], {'a': 'xxx'});
	q.equal(state, '');
});

test("Asks callback for preferred state", function() {
	var g = new GameStates();
	g.setStateCalculator(function(data) {
		q.deepEqual(data.users, ['a', 'b']);
		q.deepEqual(data.userstates, {'a': 'state1', 'b': 'state2'});
		return 'xxx123';
	});
	var state = g._getPreferredGameState(['a', 'b'], {'a': 'state1', 'b': 'state2'});
	q.equal(state, 'xxx123');
});

test("_getPreferredGameStateQuery can calculate unique states", function() {
	var g = new GameStates();
	var r = g._getPreferredGameStateQuery(['a', 'b', 'c'], {'a': 'state1', 'b': 'state2', 'c': 'state2'});
	console.log(r);
	q.deepEqual(r.unique, ['state1', 'state2']);
});

test("_getPreferredGameStateQuery finds all-equal states 1", function() {
	var g = new GameStates();
	var r = g._getPreferredGameStateQuery(['a', 'b', 'x'], {'a': 'state2', 'b': 'state2', 'x': 'state2'});
	q.equal(r.all, 'state2');
});

test("_getPreferredGameStateQuery finds all-equal states 2", function() {
	var g = new GameStates();
	var r = g._getPreferredGameStateQuery(['a', 'b', 'x'], {'a': 'state2', 'b': 'state2', 'x': 'state3'});
	q.equal(r.all, '');
});

test("_getPreferredGameStateQuery finds all-equal states 3", function() {
	var g = new GameStates();
	var r = g._getPreferredGameStateQuery(['a', 'b', 'c', 'd'], {'a': 'state2'});
	q.deepEqual(r.states, ['state2', '', '', '']);
	q.deepEqual(r.unique, ['state2', '']);
	q.equal(r.all, '');
});

test("When changing state, leave and enter events are fired", function() {
	stop();
	var g = new GameStates({state:'a'});
	g.onLeaveState = new Observable.Mocked();
	g.onEnterState = new Observable.Mocked();
	g._changeGameState('a');
	g.onLeaveState.expect(null);
	g.onEnterState.expect(null);
	g._changeGameState('b');
	g.onLeaveState.expect({state:'a', nextstate:'b'})
	g.onEnterState.expect({state:'b', laststate:'a'})
	start();
});

test("When all peers enters the same state the game state changes", function() {
	stop();
	var g = new GameStates({ users: ['a', 'b', 'c'] });
	g.setStateCalculator(function(data) {
		if (data.all == 'started')
			return 'start';
		if (data.all == 'ready')
			return 'start';
		if (data.unique.indexOf('disconnected') != -1)
			return 'paused';
		if (data.unique.indexOf('ready') != -1)
			return 'ready';
		return '';
	});
	g.onEnterState = new Observable.Mocked();

	g.peerChangedState('a', 'ready');
	g.onEnterState.expect({state:'ready', laststate:''});

	g.peerChangedState('b', 'ready');
	g.onEnterState.expect(null);

	g.peerChangedState('c', 'ready');
	g.onEnterState.expect({state:'start', laststate:'ready'});

	g.peerChangedState('b', 'disconnected');
	g.onEnterState.expect({state:'paused', laststate:'start'});

	g.peerChangedState('b', 'ready');
	g.onEnterState.expect({state:'start', laststate:'paused'});

	start();
});