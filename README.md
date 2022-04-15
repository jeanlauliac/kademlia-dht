⚠️ This repo is unmaintained and out-of-date, uses old JavaScript syntax and idioms. You might have a
look at the general Kademlia approach, but I wouldn't use any of this as a starting point for another
project 😉

---

# kademlia-dht

**kademlia-dht** is a javascript, network-agnostic implementation of the
[Distributed Hash Table](http://en.wikipedia.org/wiki/Distributed_hash_table)
storage container abstraction, employing the
[Kademlia](http://en.wikipedia.org/wiki/Kademlia) algorithms and data
structures.

From a local point of view, a DHT is similar to a classic hash table. It
provides two main operations, `set` and `get` allowing you, respectively,
to store a key/value pair, and to retrieve a value from the key. The
"distributed" aspect comes from the fact the pairs are stored accross a
network of interconnected nodes (eg. over the Internet), making it suitable
to provide information to a large number of users. Typical usage of DHTs
include file-sharing (eg. Bitorrent).

**kademlia-dht** is implemented with Node.js, but does not depend on system
resources, like the network. Instead, the implementation of the network layer
(called by Kademlia the *Remote Procedure Calls*) is left to the user or
higher-level libraries. That means this DHT implementation is theorically
adaptable to the browser JS without too much hassle.

**Note:** this implementation is, for now partially complete. It basically
lacks two things:

   * the handling of time-driven behaviors: key/value pairs expiration,
     bucket refresh, replication, and pairs republish.
   * an implementation of the Rpc usable out-of-the-box (it will be done as a
     separate library) even though it's possible to use your own already;

## Installation

    npm install kademlia-dht

## Example usage

This example creates two nodes on a mock network, stores a value on
one node, then get it on the other node.

```js
'use strict';

var kad = require('kademlia-dht');

// Store a value on one side and get it back on the other side.
//
function demo(dht1, dht2) {
    dht1.set('beep', 'boop', function (err) {
        dht2.get('beep', function (err, value) {
            console.log('%s === %s', 'boop', value);
        });
    });
}

// Spawn a node. A node is composed of two elements: the local Dht and the Rpc.
//
function spawnNode(endpoint, seeds, cb) {
    kad.MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        kad.Dht.spawn(rpc, seeds, function (err, dht) {
            if (err) return cb(err);
            cb(err, dht);
        });
    });
}

spawnNode('localhost:9876', [], function (err, dht1) {
    spawnNode('localhost:4321', [dht1.rpc.endpoint], function (err, dht2) {
        demo(dht1, dht2);
    });
});
```

Output:

    boop === boop

`MockRpc` is provided for demonstration and tests. It works by simulating a
basic network of interconnected nodes. Every instance of `MockRpc` can send
messages to any other instances of the same node.js process. For a real
use case, you must implement your own Rpc or use a higher-level library. The
Rpc interface is explained below.

This example is available as `example/demo.js`.

## Notes

A Dht cannot ensure a complete consistency of the returned data. The fact new
nodes arrive and other exit the network at any time causes variations in the
lookup algorithm: all nodes resulting from the lookup are not necessarily
up-to-date all the time. You must take into account this variability when
processing returned values.

Moreover, a Dht can hardly ensure the authenticity of the values. For instance,
a technique known as the *Sybil attack* allows attackers to cluster around
a specific key, accepting any store operation, but then returning a malicious
value or no value at all instead of the expected one. This kind of attack
is inherent to the structure of such a distributed system, even though some
tentative implementations try to counteract *via* trust-based systems.

The following documents have been the basis of this Kademlia implementation:

  * http://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf
  * http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html

## API

### Class: Dht

#### new Dht(rpc, id)

Create directly the node from an Id. You should never use this directly.

#### Dht.spawn(rpc, seeds, callback)

  * `rpc` *Rpc* The RPC object to use to send messages to the network.
  * `seeds` *Array* An array of known endpoints (eg. IPs).
  * `callback(err, dht)` *Function* Called when the Dht is ready.

Create a brand new Dht. It will try to connect to the seeds, and grab
knowledge about its nearest nodes. You cannot use a Dht that's not connected
to some network, hence the need for seeds.

The Dht takes ownership of the rpc, and it should not be used for anything
else in your application.

#### dht.set(key, value, callback)

  * `key` *String*
  * `value` *Any*
  * `callback` *Function* Called with arguments `(err)` once the key/value pair
    has been replicated onto the network.

#### dht.get(key, callback)

  * `key` *String*
  * `callback(err, value)` *Function* Called once the value is found.

If the key cannot be found on the network, this is not an error. The value
will merely be `null`.

#### dht.peek(key)

  * `key` *String*

Return immediately the associated value if known locally. You can use this
method to avoid the callback overhead, but only very few key/value pair are
available with this technique.

#### dht.close()

Close the Dht and the inner node. No other operation is then possible.

### Class: Rpc

This describe the excepted interface for the `rpc` object provided to
`Dht.spawn()`.

#### rpc.send(message, endpoint, payload, cb)

  * `message` *String* Type of message, always one of: "ping", "store",
    "findNode" or "findValue".
  * `endpoint` *Any* A value representing the 'endpoint' of the node. Generally
    it will be a pair `{ipAddress, port}`, when the Rpc is implemented over
    TCP or UDP.
  * `payload` *Object* An object containing information attached to the
    message.
  * `cb(err, result)` *Function* To be called once the message got a reply.

This function must implement a timeout mechanism, and callback with an error
if so happens. This ensures the Dht does not hang up on a request and properly
take into account unresponsive nodes.

#### rpc.receive(message, handler)

  * `message` *String* Type of message to handle.
  * `handler(payload)` *Function* Function locally handling the specified
    message.

Register a local handler.

The receive handler must be a synchronous operation. The handling function
returns a result object that must be forwarded to the node initiating the
request. The handler may throw, in which case an error should be forwarded to
the remote node; make sure, though, that no local information leaks such as
stacktraces, because they can contain personal or sensitive information.

#### rpc.close()

Close the Rpc endpoint and prevent any further call to message handlers.

