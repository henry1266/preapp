// 藥品覆核對話框相關功能
// 覆核對話框元素
const reviewModal = document.getElementById('reviewModal');
const closeReviewModal = document.querySelector('.close-review-modal');
const reviewMedicationInfo = document.getElementById('reviewMedicationInfo');
const reviewCorrectBtn = document.getElementById('reviewCorrectBtn');
const reviewIncorrectClinicBtn = document.getElementById('reviewIncorrectClinicBtn');
const reviewIncorrectPharmacyBtn = document.getElementById('reviewIncorrectPharmacyBtn');

// 藥品選取音效 - 修改為與改單按鈕一致的預加載方式
const selectSound = new Audio('/sounds/selection/select_alert.mp3');
// 預先加載音效，確保瀏覽器已經準備好音效資源
selectSound.load();

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
    
    // 找到對應的藥品行並標記為錯誤
    highlightErrorMedication(data);
  }
  
  // 3秒後恢復原始背景顏色
  setTimeout(() => {
    document.body.style.backgroundColor = '#f4f4f4';
  }, 3000);
});

// 標記錯誤藥品並顯示註記框
function highlightErrorMedication(data) {
  // 尋找所有藥品行
  const medicationRows = document.querySelectorAll('tr[data-medication-id]');
  
  // 遍歷所有藥品行，找到匹配的ID
  medicationRows.forEach(row => {
    if (row.dataset.medicationId === data.id) {
      // 設置錯誤底色
      row.style.backgroundColor = '#f8d7da';
      
      // 移除可能已存在的註記框
      const existingAnnotation = document.querySelector('.error-annotation-cell');
      if (existingAnnotation) {
        existingAnnotation.remove();
      }
      
      // 創建新的表格單元格來放置註記
      const annotationCell = document.createElement('td');
      annotationCell.className = 'error-annotation-cell';
      annotationCell.style.backgroundColor = '#fff';
      annotationCell.style.border = '2px solid #dc3545';
      annotationCell.style.borderRadius = '4px';
      annotationCell.style.padding = '5px 10px';
      annotationCell.style.verticalAlign = 'middle';
      
      // 設置註記內容
      let errorSource = '未知來源';
      if (data.result === 'incorrect_clinic') {
        errorSource = '診所錯誤';
      } else if (data.result === 'incorrect_pharmacy') {
        errorSource = '藥局錯誤';
      }
      
      annotationCell.innerHTML = `
        <strong>錯誤!</strong>
        <p>${errorSource}</p>
        <p>${data.resultText || ''}</p>
      `;
      
      // 將註記單元格添加到行中
      row.appendChild(annotationCell);
      
      // 確保註記單元格可見
      annotationCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // 添加一個關閉按鈕
      const closeButton = document.createElement('button');
      closeButton.textContent = 'X';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '2px';
      closeButton.style.right = '2px';
      closeButton.style.background = 'none';
      closeButton.style.border = 'none';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = '#dc3545';
      closeButton.style.fontWeight = 'bold';
      
      closeButton.addEventListener('click', function() {
        annotationCell.remove();
      });
      
      annotationCell.style.position = 'relative';
      annotationCell.appendChild(closeButton);
      
      // 不再設置自動消失的計時器，讓註記框持續顯示
    }
  });
}

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
  
  // 播放選取音效 - 修改播放方式，確保在用戶互動後播放
  try {
    // 重置音效播放位置，避免重複觸發時無法播放
    selectSound.currentTime = 0;
    // 使用 Promise 處理播放
    const playPromise = selectSound.play();
    
    if (playPromise !== undefined) {
      playPromise.then(_ => {
        // 播放成功
        console.log('選取音效播放成功');
      }).catch(error => {
        // 播放失敗，嘗試在用戶互動後再次播放
        console.error('播放選取音效失敗:', error);
        
        // 在用戶點擊對話框按鈕時播放音效
        const playOnInteraction = function() {
          selectSound.currentTime = 0;
          selectSound.play().catch(e => console.error('互動後播放仍失敗:', e));
          
          // 移除事件監聽器，避免重複播放
          reviewCorrectBtn.removeEventListener('click', playOnInteraction);
          reviewIncorrectClinicBtn.removeEventListener('click', playOnInteraction);
          reviewIncorrectPharmacyBtn.removeEventListener('click', playOnInteraction);
        };
        
        // 為對話框按鈕添加一次性事件監聽器
        reviewCorrectBtn.addEventListener('click', playOnInteraction);
        reviewIncorrectClinicBtn.addEventListener('click', playOnInteraction);
        reviewIncorrectPharmacyBtn.addEventListener('click', playOnInteraction);
      });
    }
  } catch (error) {
    console.error('播放選取音效時發生異常:', error);
  }
  
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

// 在頁面加載完成後，嘗試預先播放一次音效（靜音），以解決某些瀏覽器的自動播放限制
document.addEventListener('DOMContentLoaded', function() {
  // 暫時靜音
  const originalVolume = selectSound.volume;
  selectSound.volume = 0;
  
  // 嘗試播放
  selectSound.play().then(() => {
    // 播放成功後立即暫停並恢復音量
    selectSound.pause();
    selectSound.currentTime = 0;
    selectSound.volume = originalVolume;
    console.log('預加載音效成功');
  }).catch(error => {
    // 恢復音量但不做其他處理，等待用戶互動
    selectSound.volume = originalVolume;
    console.log('預加載音效需要用戶互動:', error);
  });
});
