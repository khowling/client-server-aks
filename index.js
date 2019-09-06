


const broker = require('./broker')
const engine = require('./engine')

const engineid = process.env.ENGINE_ID
const broker_host = process.env.BROKER_HOST

if (engineid && broker_host) 
    engine.init_engine(engineid, broker_host).then(() => console.log ('finish'))
else
    broker.init_broker()


