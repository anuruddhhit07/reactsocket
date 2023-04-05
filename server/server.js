import express "express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const gettws = require("tradingview-ws");
const { connect, getCandles } = gettws;  //type TradingviewTimeframe = number | '1D' | '1W' | '1M'
const TradingView = require("@mathieuc/tradingview/main.js");
// *  '1': Period,
//  *  '5': Period,
//  *  '15': Period,
//  *  '60': Period,
//  *  '240': Period,
//  *  '1D': Period,
//  *  '1W': Period,
//  *  '1M': Period

const io = new Server(server);
console.log("in server")
app.use(express.static(__dirname + "/public"));
var clickCount = 0;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// io.on('connection', (socket) => {
//   console.log('a user connected');
// });

io.on("connection", function (client) {
  //when the server receives clicked message, do this
  client.on("clicked", function (data) {
    console.log(data);
    clickCount++;
    //send a message to ALL connected clients
    io.emit("buttonUpdate", clickCount);
  });

  client.on("getData", function (data) {
    console.log("data", data);
    //clickCount++;
    //send a message to ALL connected clients
    //io.emit('buttonUpdate', clickCount);
    asyncCall(data.Datafor);
  });

  let tvclient = null;
  let tvchart = null;

  let tvclient_id = [];
  let tvchart_id = [];
  client.on("GoLive", function (data) {
    console.log("data", data);
    var current_liveid = null;
    // console.log(tvclient);
    //console.log(tvclient_id);
    if (data.IND == 1 && tvclient_id.length == 0) {
      current_liveid = 1;

      tvclient = new TradingView.Client(); // Creates a websocket client
      tvchart = new tvclient.Session.Chart(); // Init a Chart session

      tvclient_id.push(tvclient);
      tvchart_id.push(tvchart);

      tvchart.setMarket("NSE:NIFTY", {
      //tvchart.setMarket("BINANCE:BTCEUR", {
        // Set the market
        //timeframe: "D",
        timeframe: "1",
      });
      tvchart.onError((...err) => {
        // Listen for errors (can avoid crash)
        console.error("Chart error:", ...err);
        // Do something...
      });
      tvchart.onSymbolLoaded(() => {
        // When the symbol is successfully loaded
        console.log(`Market "${tvchart.infos.description}" loaded !`);
      });
      //sendTime()

      tvchart.onUpdate(() => {
        // When price changes
        if (!tvchart.periods[0]) return;
        console.log(`[${tvchart.infos.description}]: ${tvchart.periods[0].close} ${tvchart.infos.currency_id}`);
        // Do something...
        console.log(tvchart.periods[0]);
        //io.emit("getmessage", { message: `[${tvchart.infos.description}]: ${tvchart.periods[0].close} ${tvchart.infos.currency_id}` });
        io.emit("getmessage", {
          message: JSON.stringify({
            timestamp: tvchart.periods[0].time,
            open: tvchart.periods[0].open,
            high: tvchart.periods[0].max,
            low: tvchart.periods[0].min,
            close: tvchart.periods[0].close,
            volume: tvchart.periods[0].volume,
          }),
        });
      });
    } else {
      // io.emit("getmessage", { message: `Closing client...` });
      // tvchart.delete();
      // await tvclient.end();

      setTimeout(async () => {
        //success('Closing client...');
        io.emit("getmessage", { message: `Closing client...` });
        tvchart_id.map((tvchart, i) => {
          tvchart.delete();
          tvclient_id[i].end();
        });

        current_liveid = null;
        tvchart_id = [];
        tvclient_id = [];
      }, 1);
    }
  });
});

function sendTime() {
  io.emit("time", { time: new Date().toJSON() });
}

//setInterval(sendTime, 1000)

async function asyncCall(emitid) {
  console.log("calling");
  const connection = await connect();
  const candles = await getCandles({
    connection,
   // symbols: ["BINANCE:BTCEUR","NSE:NIFTY","BINANCE:BTCEUR", "FX:AUDCAD", "FX:AUDCHF"],
    //symbols: ["BINANCE:BTCEUR"],
    symbols: ["NSE:NIFTY"],
    amount: 500,
    //timeframe: "1D",
    timeframe: 1,
  });
  await connection.close();
  console.log(candles[0]);
  var returndata=candles[0]

  // let arrayObj = [{key1:'timestamp', key2:'unixtime'}];

  //var AA=returndata.map(({ timestamp }) => ({ "unixtime": timestamp}));

  // returndata.forEach(function(obj) {
  //   obj.unixtime = obj.timestamp;
  //   delete obj.timestamp;
  // });

  

  //console.log(`Candles for AUDCAD:`, candles[0])
  // console.log(`Candles for AUDCHF:`, candles[1])
  //return candles[0]
  // Expected output: "resolved"
  const unixTimestamp = candles[0].timestamp;

  const milliseconds = unixTimestamp * 1000; // 1575909015000
  const dt = new Date(milliseconds);
  //io.emit('time',{time:new Date().toJSON()})
  io.emit(emitid, { data: JSON.stringify(candles[0]) });
}

server.listen(3002, () => {
  console.log("listening on *:3002");
});