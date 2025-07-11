// app.js
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
  initChat();
});

function initChat() {
  const joinBtn   = document.getElementById('join-btn');
  const sendBtn   = document.getElementById('send-btn');
  const inUser    = document.getElementById('username');
  const selRoom   = document.getElementById('room-select');
  const inPw      = document.getElementById('room-password');
  const chatArea  = document.getElementById('chat-area');
  const chatBox   = document.getElementById('chat-box');
  const msgInput  = document.getElementById('message');

  // ルーム一覧を<select>に反映する関数
  function updateRoomOptions(rooms) {
    // 既存オプションをクリア
    selRoom.innerHTML = '<option value="" disabled selected>ルームを選択してください</option>';
    rooms.forEach(id => {
      const opt = document.createElement('option');
      opt.value   = id;
      opt.text    = id;
      selRoom.appendChild(opt);
    });
  }

  // 初回ロードでAPIから取得
  fetch('/api/rooms')
    .then(res => res.json())
    .then(updateRoomOptions)
    .catch(err => console.error('初回ルーム取得失敗', err));

  // 管理画面でルームが追加/削除されたら即更新
  socket.on('rooms updated', updateRoomOptions);

  // 参加ボタン
  joinBtn.addEventListener('click', () => {
    const username = inUser.value.trim();
    const roomId   = selRoom.value;
    const password = inPw.value.trim();

    if (!username || !roomId) {
      return alert('名前とルームを正しく入力してください');
    }

    // 画面切り替え前にチャットエリアをクリア
    chatBox.innerHTML = '';
    chatArea.style.display = 'block';

    // サーバーに参加リクエスト（パスワード含む）
    socket.emit('join room', { username, roomId, password });
  });

  // パスワードや存在チェックで弾かれた場合
  socket.on('join error', msg => {
    alert(msg);
    chatArea.style.display = 'none';
  });

  // 過去の履歴受信（全件）
  socket.on('chat history', rows => {
    rows.forEach(({ user, message, timestamp }) => {
      appendMsg(user, message, timestamp);
    });
  });

  // システムメッセージ受信
  socket.on('system message', msg => {
    appendMsg('システム', msg);
  });

  // 新着メッセージ受信
  socket.on('chat message', ({ user, message, timestamp }) => {
    appendMsg(user, message, timestamp);
  });

  // メッセージ送信
  sendBtn.addEventListener('click', () => {
    const text = msgInput.value.trim();
    if (!text) return;
    socket.emit('chat message', {
      roomId: selRoom.value,
      username: inUser.value.trim(),
      message: text
    });
    msgInput.value = '';
  });

  // メッセージ描画ヘルパー
  function appendMsg(sender, text, ts = Date.now()) {
    const time = new Date(ts).toLocaleTimeString();
    const p    = document.createElement('p');
    p.innerHTML = `<small>[${time}]</small> <strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}
