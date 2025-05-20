// 按鈕特效與動畫功能
// 閃爍動畫函數 - 增強版
function flashScreen(color) {
  // 移除可能存在的動畫類別
  document.body.classList.remove('flash-animation');
  
  // 保存原始背景色
  const originalColor = document.body.style.backgroundColor;
  
  // 設置新的背景色
  document.body.style.backgroundColor = color;
  
  // 強制重繪以確保動畫重置
  void document.body.offsetWidth;
  
  // 添加動畫類別
  document.body.classList.add('flash-animation');
  
  // 動畫結束後恢復原始背景色
  setTimeout(() => {
    document.body.classList.remove('flash-animation');
    // 不立即恢復，保持顏色一段時間
  }, 500); // 與 CSS 動畫時間一致
  
  // 3秒後恢復原始背景色
  setTimeout(() => {
    document.body.style.backgroundColor = '#f4f4f4';
  }, 3000);
}

// 按鈕特效函數
function buttonEffect(button, color) {
  // 保存原始樣式
  const originalBgColor = button.style.backgroundColor;
  const originalTransform = button.style.transform;
  const originalBoxShadow = button.style.boxShadow;
  
  // 應用特效
  button.style.transform = 'scale(1.2)';
  button.style.boxShadow = '0 0 15px ' + color;
  
  // 恢復原始樣式
  setTimeout(() => {
    button.style.transform = originalTransform;
    button.style.boxShadow = originalBoxShadow;
  }, 300);
}

// 按鈕點擊事件
cancelBtn.addEventListener('click', function() {
  // 播放取消音效
  cancelSound.play();
  
  // 觸發按鈕特效
  buttonEffect(cancelBtn, '#ff0000');
  
  // 觸發閃爍動畫
  flashScreen('#ffcccc');
  
  // 發送取消事件到伺服器
  socket.emit('prescription_cancel');
});

modifyBtn.addEventListener('click', function() {
  // 播放改單音效
  modifySound.play();
  
  // 觸發按鈕特效
  buttonEffect(modifyBtn, '#ffcc00');
  
  // 觸發閃爍動畫
  flashScreen('#ffffcc');
  
  // 發送改單事件到伺服器
  socket.emit('prescription_modify');
});

// 接收取消事件
socket.on('prescription_cancel_broadcast', function() {
  // 播放取消音效
  cancelSound.play();
  
  // 觸發閃爍動畫
  flashScreen('#ffcccc');
  
  // 觸發按鈕特效
  buttonEffect(cancelBtn, '#ff0000');
});

// 接收改單事件
socket.on('prescription_modify_broadcast', function() {
  // 播放改單音效
  modifySound.play();
  
  // 觸發閃爍動畫
  flashScreen('#ffffcc');
  
  // 觸發按鈕特效
  buttonEffect(modifyBtn, '#ffcc00');
});

// 接收重置事件
socket.on('prescription_reset_broadcast', function() {
  // 恢復原始背景顏色
  document.body.style.backgroundColor = '#f4f4f4';
});
