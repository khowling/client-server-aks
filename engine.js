

/* Or use this example tcp client written in node.js.  (Originated with 
example code from 
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */

const net = require('net')

function backoff(engineid, broker_host) {
	return new Promise((acc, rej) => {

		var retry_connection = false
		console.log (`Staring engine [${engineid}], looing for broker [${broker_host}]....`)
	
		var client = net.createConnection(1337, broker_host, () => {
			// this tries to provent the packed conncatination (message conncatination) I see when scalling engines to 1100
			// https://github.com/nodejs/node/issues/906
			client.setNoDelay(true)
			console.log('Connected')
			client.write(`NewEngine:${engineid}:0`)
		});
	
		var hb_int
		client.on('data', function(data) {
			const msg = data.toString().split(":")
			if (msg[0] === 'SUCCESS') {
				let cnt = 1
				hb_int = setInterval (() => client.write(`HeartBeat:${engineid}:${cnt++}`), 10000)
			} else {
				console.error (msg[1])
				client.end()
			}
		});
	
	
		client.on('close', function() {
			if (hb_int) clearInterval(hb_int)
			console.log('Connection closed')
			return acc(retry_connection)
		})
	
		client.on('error',  (err) => {
			if (err.code === 'ENOTFOUND') {
				retry_connection = true
			} else { 
				console.error(err)
			}
		})

	})
}

async function  init_engine(...args) {

	const retries = 4, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
	let retry = true
	for (let t = 0; t <=retries && retry == true; t++) {
		if (t>0) {
			console.log (`retrying after ${(t*3000)/1000} seconds....`)
			await sleep (t*3000)
		}
		let retry = await backoff(...args)
	}
}

module.exports = {
    init_engine
}