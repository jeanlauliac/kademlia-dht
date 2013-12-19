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

## Installation

    npm install kademlia-dht

## Example usage

This example creates two nodes on a mock network, stores a value on
one node, then get it on the other node.

```js
'use strict';

var Dht = require('kademlia-dht');
var MockRpc = require('kademlia-dht/lib/mock-rpc');

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
    MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        Dht.spawn(rpc, seeds, function (err, dht) {
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
