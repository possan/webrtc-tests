QUnit.module("Observable");

test("Exists", function() {
	var o = new Observable();
	ok(o != null);
});

test("First listener receives message", function() {
	var o = new Observable();
	var ok1 = 0;
	o.addListener(function(msg) { ok1 = (msg.data === '123') });
	o.fire({ data: '123' });
	stop();
  setTimeout(function() {
		ok( ok1 );
		start();
	}, 10);
});

test("All receivers get message", function() {
	var o = new Observable();
	var ok1 = 0;
	var ok2 = 0;
	var ok3 = 0;
	var counter = 1;
	o.addListener(function(msg) { ok1 = (msg.data === '123') ? counter : 0; counter ++; });
	o.addListener(function(msg) { ok2 = (msg.data === '123') ? counter : 0; counter ++; });
	o.addListener(function(msg) { ok3 = (msg.data === '123') ? counter : 0; counter ++; });
	o.fire({ data: '123' });
	stop();
	setTimeout(function() {
		QUnit.equal( 1, ok1 );
		QUnit.equal( 2, ok2 );
		QUnit.equal( 3, ok3 );
		start();
	}, 10);
});