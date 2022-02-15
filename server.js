const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var mysql = require('mysql');

var db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'node'
})

var notes = [];
var magazine = [];

// Log any errors connected to the db
db.connect(function(err){
  if (err) console.log(err)
})

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('index.html');
});


io.on('connection', (socket) => {
  
  console.log('a user connected');

  //Когда подключились к системе
  db.query('SELECT * FROM notes WHERE status = "Тревога!"')
  .on('result', function(data){
      notes.push(JSON.stringify(data));   
  })
  .on('end', function(){
      console.log(notes);
      socket.emit('initial notes', notes);
      notes = [];
  })
  
  //Когда запросили экспорт
  socket.on('exportExcel', () => {
    console.log('EXCEL EXPORTED');

    //Когда подключились к системе
    db.query('SELECT * FROM magazine')
    .on('result', function(data){
        magazine.push(JSON.stringify(data));   
    })
    .on('end', function(){
        console.log(magazine);
        socket.emit('exportExcel', magazine);
        magazine = [];
    })
  });


  //Когда подняли тревогу
  socket.on('alert', (data) => {
    console.log("lool");
    db.query('INSERT INTO notes (building, floor, entrance, FIO, status) VALUES ('+data.building+', '+data.floor+', '+data.entrance+', "'+data.FIO+'", "'+data.status+'")', function(err, result, fields){
      if (err) throw err;
      data = {
        ...data,
        "id":result.insertId
      }
      io.emit('alert', data);      
    });
    let now = new Date();
    console.log(now);
    db.query('INSERT INTO magazine (detail, FIO, status, date) VALUES ( "Здание №'+data.building+' на '+data.floor+' этаже в '+data.entrance+' подъезде", "'+data.FIO+'", "Включена аварийная система", ' + Date.now()+ ')');
  });

  //Когда отправили отряд ПСО
  socket.on('sendSBR', (data) => {
    io.emit('sendSBR', data);
    db.query('UPDATE notes SET status="ПСО" WHERE id='+data.id);
    db.query('INSERT INTO magazine (detail, FIO, status, date) VALUES ( "Здание №'+data.building+' на '+data.floor+' этаже в '+data.entrance+' подъезде", "'+data.FIO+'", "Отправлена группа ПСО", ' + Date.now()+ ')');
  });

   //Отмена тревоги
   socket.on('cancelAlert', (data) => {
     console.log("отменен");
    io.emit('cancelAlert', data.id);
    db.query('DELETE FROM notes WHERE id='+data.id);
    db.query('INSERT INTO magazine (detail, FIO, status, date) VALUES ( "Здание №'+data.building+' на '+data.floor+' этаже в '+data.entrance+' подъезде", "'+data.FIO+'", "Тревога была отменена, механизмы перезапущены", ' + Date.now()+ ')');
  });

});

server.listen(3000, () => {
  console.log('listening on *:3000');
});