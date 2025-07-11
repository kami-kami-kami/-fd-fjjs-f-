// public/admin.js
const socketAdmin = io();

document.addEventListener('DOMContentLoaded', () => {
  const listDiv = document.getElementById('admin-room-list');
  const btnAdd  = document.getElementById('add-room-btn');
  const inpId   = document.getElementById('new-room-id');
  const inpPw   = document.getElementById('new-room-pw');

  // ルーム一覧＆ユーザー情報を描画する
  function renderAdminList(rooms) {
    listDiv.innerHTML = rooms.map(room => {
      const usersHtml = room.users.map(u => 
        `<li>
           ${u.username}
           <button class="kick-btn" 
                   data-room="${room.id}" 
                   data-sid="${u.socketId}">
             キック
           </button>
         </li>`
      ).join('');
      return `
        <div class="room-item">
          <div class="room-header">
            <span>${room.id}</span>
            <button class="del-btn" data-id="${room.id}">削除</button>
          </div>
          <div>パスワード: ${room.password || '<なし>'}</div>
          <ul>${usersHtml}</ul>
        </div>
      `;
    }).join('');
    // 削除ボタン
    listDiv.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        socketAdmin.emit('delete room', e.target.dataset.id);
      });
    });
    // キックボタン
    listDiv.querySelectorAll('.kick-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        socketAdmin.emit('kick user', {
          roomId: e.target.dataset.room,
          socketId: e.target.dataset.sid
        });
      });
    });
  }

  // 初回読み込み
  fetch('/api/admin/rooms')
    .then(res => res.json())
    .then(renderAdminList)
    .catch(console.error);

  // リアルタイム更新
  socketAdmin.on('admin rooms updated', renderAdminList);

  // ルーム作成
  btnAdd.addEventListener('click', () => {
    const id = inpId.value.trim();
    const pw = inpPw.value.trim();
    if (!id) return alert('ルームIDを入力してください');
    socketAdmin.emit('add room', { roomId: id, password: pw });
    inpId.value = '';
    inpPw.value = '';
  });
});
