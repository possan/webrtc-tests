
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















