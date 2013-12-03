WARNING: work in progress.

**kademlia-dht** is a network-agnostic implementation of the Distributed
Hash Table abstraction, following the Kademlia algorithms and structures.

## Installation

    npm install kademlia-dht

## Example usage

This examples creates two nodes on a mock network, stores a value on
one node, then get it on the other node.

```js
var Dht = require('kademlia-dht');
var MockRpc = require('kademlia-dht/lib/mock-rpc');

// Store a value on one side and get it back on the other side.
//
function demo(dht1, dht2) {
    dht.set('beep', 'boop', function (err) {
        dht2.get('beep', function (err, value) {
            console.log('%s === %s', 'boop', value);
        })
    });
}

// Spawn a node. A node is composed of two elements: the local Dht and the Rpc.
//
function spawnNode(endpoint, seed, cb) {
    MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        Dht.spawn(rpc, seed, function (err, dht) {
            if (err) return cb(err);
            rpc.recipient(dht);
            cb(err, dht);
        });
    });
}

spawnNode('localhost:9876', null, function (err, dht1) {
    spawnNode('localhost:4321', dht1.rpc.endpoint, function (err, dht2) {
        demo(dht1, dht2);
    });
});
```

Output:

    boop === boop

You must provide the implementation of the Kademlia RPC protocol: the library
is network-agnostic. That means, for instance, you cannot use the library to
create a Dht on the Internet out-of-the-box. The expected interface of RPC
objects is described below.

`MockRpc` is provided for demonstration and tests. It works by simulating a
flat network of interconnected nodes. Every instance of `MockRpc` can send
messages to any other instances of the same node.js process. This is pretty
much useless for any real use case.

## API

### Class: Dht

#### new Dht(rpc, id)

#### Dht.spawn(rpc, callback)

  * `rpc` *Rpc* The RPC object to use to send messages to the network.
  * `callback` *Function* Called when the Dht is ready.

#### dht.set(key, value, callback)

  * `key` *String*
  * `value` *Any*
  * `callback` *Function* Called with arguments `(err)` once the key/value pair
    is replicated on the network.

#### dht.get(key, callback)

  * `key` *String*
  * `callback` *Function* Called with arguments `(err, value)` once the value
    is found.

#### dht.ping(contact, callback)

  * `contact` *Contact* Contact that originated the request.
  * `callback` *Function* Called once the ping is processed with `(err)`.

This function should be called when a `ping` RPC is received on the local node.

#### dht.store(contact, id, value, callback)

  * `contact` *Contact* Contact that originated the request.
  * `id` *Id* Key to store.
  * `value` *Any* Value to associate with the `id`.
  * `callback` *Function* Called once the ping is processed with `(err)`.

#### dht.findNode(contact, id, callback)

  * `contact` *Contact* Contact that originated the request.
  * `callback` *Function* Called once the ping is processed with `(err)`.

#### dht.findValue(contact, id, callback)

  * `contact` *Contact* Contact that originated the request.
  * `callback` *Function* Called once the ping is processed with `(err)`.

