/*
In the node.js intro tutorial (http://nodejs.org/), they show a basic tcp 
server, but for some reason omit a client connecting to it.  I added an 
example at the bottom.

Save the following server in example.js:
*/

const net = require('net');


function init_broker() {

    const port = 1337, interface = '0.0.0.0'
    var engines = new Map()

    console.log ('Staring broker....')
    var server = net.createServer()


    server.on('connection', (socket) => {

        // this tries to provent the packed conncatination (message conncatination) I see when scalling engines to 1100
	    // https://github.com/nodejs/node/issues/906
        socket.setNoDelay(true)

        
        let engineid, engine_hb_cnt
        //console.log(`BROKER: New Connection from: ${socket.remoteAddress} : ${socket.remotePort} : ${socket.remoteFamily}`)
        socket.on('data', (data) => {

            const msg = data.toString().split(":")
            if (msg[0] === 'NewEngine') {
                let newengineid = msg[1]
                if (engines.has(newengineid)) {
                    //console.log (`ERROR: engine ${newengineid} already registered`)
                    socket.write (`FAILLED:Duplicate Engine ID ${newengineid}`)
                } else {
                    engineid = newengineid
                    engine_hb_cnt = Number(msg[2])
                    engines.set (engineid, {date: Date.now(), count: engine_hb_cnt})
                    socket.write ("SUCCESS:Registered")
                }
            } else if (msg[0] === 'HeartBeat') {
                if (!engineid || msg[1] !== engineid) {
                    console.log (`ERROR: Heatbeat received from Unknown Engine, was expecing ${engineid}, got ${data.toString()}`)
                } else {

                    let new_engine_hb_cnt = Number(msg[2])
                    if (new_engine_hb_cnt === engine_hb_cnt + 1) {
                        engine_hb_cnt = new_engine_hb_cnt
                        engines.set (engineid, {date: Date.now(), count: engine_hb_cnt})
                    } else {
                        console.error (`ERROR MISSING HEARTBEAT [${engineid}], last Heartbeat cnt ${engine_hb_cnt}, received Heartbeat cnt ${msg[2]} `)
                    }
                }
            } else {
                console.log (`ERROR: Unknown Engine message: ${data}`)
            }

        })

        socket.on('close', (data) => {
            //console.log(`Engine Disconnected`)
            if (engineid) {
                engines.delete (engineid)
            }
        })
    })

    server.on('error', (err) => {
        throw err;
    });
        
    server.listen(port, interface)

    setInterval(() => {
        //console.log ("BROKER: getting current connections")
        server.getConnections((err, cnt) => {
            console.log (`BROKER: active tcp connections: ${cnt} (registered engines : ${engines.size})`)
            const now = Date.now()
            for (var [key, value] of engines) {
                if (now-value > 40000) {
                    console.log (`Engine [${key}] last heatbeat received : ${now-value}mS`)
                }
            }
        })
    }, 10000)

}

module.exports = {
    init_broker
}

/*

$ netcat 127.0.0.1 1337

You should see:
> Echo server

*/