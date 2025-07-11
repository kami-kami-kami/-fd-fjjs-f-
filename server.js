// server.js
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const sqlite3  = require('sqlite3').verbose();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

// --- 1) SQLite3 初期化 ---
const db = new sqlite3.Database('chat.db');
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId    TEXT NOT NULL,
      user      TEXT NOT NULL,
      message   TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
});

// --- 2) ルーム一覧 (メモリ) ---
// { id: string, password: string, users: [{ socketId, username }] }
let rooms = [];

// 静的ファイル配信
app.use(express.static('public'));

// 公開用ルームID API
app.get('/api/rooms', (req, res) => {
  res.json(rooms.map(r => r.id));
});

// 管理画面用ルーム詳細 API
app.get('/api/admin/rooms', (req, res) => {
  res.json(rooms);
});

io.on('connection', socket => {
  // --- 管理: ルーム作成 ---
  socket.on('add room', ({ roomId, password }) => {
    if (roomId && !rooms.find(r => r.id === roomId)) {
      rooms.push({ id: roomId, password, users: [] });
      io.emit('rooms updated', rooms.map(r => r.id));
      io.emit('admin rooms updated', rooms);
    }
  });

  // --- 管理: ルーム削除 ---
  socket.on('delete room', roomId => {
    rooms = rooms.filter(r => r.id !== roomId);
    io.emit('rooms updated', rooms.map(r => r.id));
    io.emit('admin rooms updated', rooms);
  });

  // --- 管理: ユーザーキック ---
  socket.on('kick user', ({ roomId, socketId }) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    // クライアントに通知して退出させる
    const client = io.sockets.sockets.get(socketId);
    if (client) {
      client.emit('kicked', { roomId });
      client.leave(roomId);
    }
    // メモリ上のユーザーリストから除外
    room.users = room.users.filter(u => u.socketId !== socketId);
    io.emit('admin rooms updated', rooms);
  });

  // --- チャット: ルーム参加 ---
  socket.on('join room', ({ username, roomId, password }) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return socket.emit('join error', 'ルームが存在しません');
    }
    if (room.password && room.password !== password) {
      return socket.emit('join error', 'パスワードが違います');
    }

    socket.username = username;
    socket.join(roomId);
    room.users.push({ socketId: socket.id, username });

    // 履歴を読み出して参加クライアントに送信
    db.all(
      `SELECT user, message, timestamp
       FROM messages
       WHERE roomId = ?
       ORDER BY id DESC LIMIT 50`,
      [roomId],
      (err, rows) => {
        if (!err) socket.emit('chat history', rows.reverse());
      }
    );

    // 管理画面に最新のユーザーリストを通知
    io.emit('admin rooms updated', rooms);

    // 参加通知
    io.to(roomId).emit('system message', `${username} さんが参加しました`);
  });

  // --- チャット: メッセージ受信 ---
  socket.on('chat message', ({ roomId, username, message }) => {
    const timestamp = Date.now();
    // DB に保存
    db.run(
      `INSERT INTO messages (roomId, user, message, timestamp)
       VALUES (?, ?, ?, ?)`,
      [roomId, username, message, timestamp]
    );
    // ルーム内に配信
    io.to(roomId).emit('chat message', { user: username, message, timestamp });
  });

  // --- 切断時: ユーザーリスト更新 ---
  socket.on('disconnect', () => {
    rooms.forEach(room => {
      room.users = room.users.filter(u => u.socketId !== socket.id);
    });
    io.emit('admin rooms updated', rooms);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
