// public/chat.js
const socketChat = io();

document.addEventListener('DOMContentLoaded', () => {
  const selRoom  = document.getElementById('room-select');
  const btnJoin  = document.getElementById('join-btn');
  const inpUser  = document.getElementById('username');
  const inpPw    = document.getElementById('room-password');
  const chatArea = document.getElementById('chat-area');
  const chatBox  = document.getElementById('chat-box');
  const inpMsg   = document.getElementById('message');
  const btnSend  = document.getElementById('send-btn');

  // <select> を更新
  function updateOptions(roomIds) {
    selRoom.innerHTML =
      '<option value="" disabled selected>ルームを選択してください</option>';
    roomIds.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.text  = id;
      selRoom.append(opt);
    });
  }

  // 初回ロード
  fetch('/api/rooms')
    .then(res => res.json())
    .then(updateOptions)
    .catch(console.error);

  // 管理画面側の追加/削除をリアルタイム反映
  socketChat.on('rooms updated', updateOptions);

  // 参加処理
  btnJoin.addEventListener('click', () => {
    const username = inpUser.value.trim();
    const roomId   = selRoom.value;
    const password = inpPw.value.trim();
    if (!username || !roomId) return alert('名前とルームを入力してください');

    // 画面初期化
    chatBox.innerHTML = '';
    chatArea.style.display = 'block';

    // サーバーに参加リクエスト
    socketChat.emit('join room', { username, roomId, password });
  });

  // パスワードNG や存在しないルーム
  socketChat.on('join error', msg => {
    alert(msg);
    chatArea.style.display = 'none';
  });

  // 過去の全履歴受信
  socketChat.on('chat history', rows => {
    rows.forEach(({ user, message, timestamp }) => {
      appendMsg(user, message, timestamp);
    });
  });

  // システムメッセージ受信
  socketChat.on('system message', msg => appendMsg('システム', msg));

  // 新着メッセージ受信
  socketChat.on('chat message', ({ user, message, timestamp }) =>
    appendMsg(user, message, timestamp)
  );

  // メッセージ送信
  btnSend.addEventListener('click', () => {
    const text = inpMsg.value.trim();
    if (!text) return;
    socketChat.emit('chat message', {
      roomId: selRoom.value,
      username: inpUser.value.trim(),
      message: text
    });
    inpMsg.value = '';
  });

  // メッセージ描画ヘルパー
  function appendMsg(sender, text, ts = Date.now()) {
    const time = new Date(ts).toLocaleTimeString();
    const p    = document.createElement('p');
    p.innerHTML = `<small>[${time}]</small> <strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
