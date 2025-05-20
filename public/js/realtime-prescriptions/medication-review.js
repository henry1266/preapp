// 藥品覆核對話框相關功能
// 覆核對話框元素
const reviewModal = document.getElementById('reviewModal');
const closeReviewModal = document.querySelector('.close-review-modal');
const reviewMedicationInfo = document.getElementById('reviewMedicationInfo');
const reviewCorrectBtn = document.getElementById('reviewCorrectBtn');
const reviewIncorrectClinicBtn = document.getElementById('reviewIncorrectClinicBtn');
const reviewIncorrectPharmacyBtn = document.getElementById('reviewIncorrectPharmacyBtn');

// 接收藥品覆核請求廣播
socket.on('medication_review_broadcast', function(data) {
  console.log('收到藥品覆核請求廣播:', data);
  showReviewModal(data);
});

// 接收覆核結果廣播
socket.on('review_result_broadcast', function(data) {
  console.log('收到覆核結果廣播:', data);
  hideReviewModal();
  
  // 根據結果設置背景顏色
  if (data.result === 'correct') {
    // 正確 - 綠色背景
    document.body.style.backgroundColor = '#d4edda';
  } else {
    // 錯誤 - 紅色背景
    document.body.style.backgroundColor = '#f8d7da';
  }
  
  // 3秒後恢復原始背景顏色
  setTimeout(() => {
    document.body.style.backgroundColor = '#f4f4f4';
  }, 3000);
});

// 顯示覆核對話框
function showReviewModal(data) {
  // 儲存當前覆核資料
  currentReviewData = data;
  
  // 設置覆核資訊
  reviewMedicationInfo.innerHTML = `
    <div class="review-item">
      <p><strong>病患:</strong> ${data.patientName || 'N/A'}</p>
      <p><strong>身分證字號:</strong> ${data.patientId || 'N/A'}</p>
      <p><strong>藥品名稱:</strong> ${data.name || 'N/A'}</p>
      <p><strong>健保碼:</strong> ${data.code || 'N/A'}</p>
      <p><strong>頻率:</strong> ${data.frequency || 'N/A'}</p>
      <p><strong>數量:</strong> ${data.quantity || '0'}</p>
    </div>
  `;
  
  // 顯示對話框
  reviewModal.style.display = 'block';
}

// 隱藏覆核對話框
function hideReviewModal() {
  reviewModal.style.display = 'none';
  currentReviewData = null;
}

// 關閉覆核對話框
closeReviewModal.addEventListener('click', function() {
  hideReviewModal();
});

// 點擊覆核對話框外部關閉
window.addEventListener('click', function(event) {
  if (event.target === reviewModal) {
    hideReviewModal();
  }
});

// 覆核結果按鈕事件
reviewCorrectBtn.addEventListener('click', function() {
  if (currentReviewData) {
    const resultData = {
      ...currentReviewData,
      result: 'correct',
      resultText: '正確'
    };
    
    // 發送覆核結果到伺服器
    socket.emit('review_result', resultData);
    console.log('已發送覆核結果:', resultData);
  }
});

reviewIncorrectClinicBtn.addEventListener('click', function() {
  if (currentReviewData) {
    const resultData = {
      ...currentReviewData,
      result: 'incorrect_clinic',
      resultText: '錯誤(診所修改)'
    };
    
    // 發送覆核結果到伺服器
    socket.emit('review_result', resultData);
    console.log('已發送覆核結果:', resultData);
  }
});

reviewIncorrectPharmacyBtn.addEventListener('click', function() {
  if (currentReviewData) {
    const resultData = {
      ...currentReviewData,
      result: 'incorrect_pharmacy',
      resultText: '錯誤(藥局修改)'
    };
    
    // 發送覆核結果到伺服器
    socket.emit('review_result', resultData);
    console.log('已發送覆核結果:', resultData);
  }
});
