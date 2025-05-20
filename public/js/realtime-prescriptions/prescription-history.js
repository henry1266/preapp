// 處方紀錄模態視窗相關功能
const prescriptionHistoryModal = document.getElementById('prescriptionHistoryModal');
const closeModal = document.querySelector('.close-modal');
const prescriptionHistoryContent = document.getElementById('prescriptionHistoryContent');

// 開啟模態視窗
searchBtn.addEventListener('click', function() {
  // 顯示模態視窗
  prescriptionHistoryModal.style.display = 'block';
  
  // 觸發按鈕特效
  buttonEffect(searchBtn, '#007bff');
  
  // 載入處方紀錄
  fetchPrescriptionHistory();
});

// 關閉模態視窗
closeModal.addEventListener('click', function() {
  prescriptionHistoryModal.style.display = 'none';
});

// 點擊模態視窗外部關閉
window.addEventListener('click', function(event) {
  if (event.target === prescriptionHistoryModal) {
    prescriptionHistoryModal.style.display = 'none';
  }
});

// 獲取處方紀錄
function fetchPrescriptionHistory() {
  prescriptionHistoryContent.innerHTML = '<p class="no-data">載入中，請稍候...</p>';
  
  // 檢查是否有當前顯示的處方資訊
  if (!currentPrescription) {
    prescriptionHistoryContent.innerHTML = '<p class="no-data">目前無病患資訊，無法查詢</p>';
    return;
  }
  
  // 從當前處方資訊中獲取病患ID
  const patientId = currentPrescription.patientId || currentPrescription.pid;
  
  if (!patientId) {
    prescriptionHistoryContent.innerHTML = '<p class="no-data">無法獲取病患ID，無法查詢</p>';
    return;
  }
  
  // 使用 fetch API 獲取處方紀錄 - 使用新的 JSON API 端點
  fetch('/searchPrescriptions/api/patient-prescriptions?pid=' + patientId)
    .then(response => {
      if (!response.ok) {
        throw new Error('網路回應不正常');
      }
      return response.json();
    })
    .then(data => {
      renderPrescriptionHistory(data);
      
      // 根據處方數量調整按鈕標題與狀態
      updateSearchButtonState(data);
    })
    .catch(error => {
      console.error('獲取處方紀錄時發生錯誤:', error);
      prescriptionHistoryContent.innerHTML = `<p class="no-data">獲取處方紀錄失敗: ${error.message}</p>`;
    });
}

// 根據處方數量更新查詢按鈕狀態
function updateSearchButtonState(data) {
  if (!data || data.length === 0) {
    // 無處方紀錄，不應該發生，保持原樣
    return;
  }
  
  if (data.length === 1) {
    // 僅有一張處方，將按鈕標題改為「初診」並反灰禁用
    searchBtn.textContent = '初診';
    searchBtn.disabled = true;
  } else {
    // 大於一筆處方，維持原樣
    searchBtn.textContent = '查詢紀錄';
    searchBtn.disabled = false;
  }
}

// 渲染處方紀錄
function renderPrescriptionHistory(data) {
  // 檢查是否有資料
  if (!data || data.length === 0) {
    prescriptionHistoryContent.innerHTML = '<p class="no-data">無處方紀錄</p>';
    return;
  }
  
  // 清空內容區域
  prescriptionHistoryContent.innerHTML = '';
  
  // 按日期分組並排序（由新到舊）
  const groupedByDate = {};
  
  // 將資料按日期分組
  data.forEach(prescription => {
    // 取得日期（格式化為 YYYYMMDD）
    const date = prescription.date ? new Date(prescription.date) : new Date();
    const dateString = date.getFullYear() +
                      String(date.getMonth() + 1).padStart(2, '0') +
                      String(date.getDate()).padStart(2, '0');
    
    if (!groupedByDate[dateString]) {
      groupedByDate[dateString] = [];
    }
    
    groupedByDate[dateString].push(prescription);
  });
  
  // 將日期排序（由新到舊）
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b - a);
  
  // 為每個日期創建一個區塊
  sortedDates.forEach(dateString => {
    const prescriptions = groupedByDate[dateString];
    
    // 對同一日期的處方按 predate 數字排序（由大到小）
    prescriptions.sort((a, b) => {
      // 將 predate 轉為數字進行比較，若無 predate 則給予 0
      const predateA = a.predate ? parseInt(a.predate, 10) : 0;
      const predateB = b.predate ? parseInt(b.predate, 10) : 0;
      return predateB - predateA; // 由大到小排序
    });
    
    // 創建日期分組容器
    const dateGroup = document.createElement('div');
    dateGroup.classList.add('prescription-date-group');
    
    // 格式化日期顯示
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const formattedDate = `${year}年${month}月${day}日`;
    
    // 添加日期標題
    const dateTitle = document.createElement('div');
    dateTitle.classList.add('prescription-date');
    dateTitle.textContent = formattedDate;
    //dateGroup.appendChild(dateTitle);
    
    // 為每個處方創建一個項目
    prescriptions.forEach((prescription, index) => {
      // 創建處方項目容器
      const prescriptionItem = document.createElement('div');
      prescriptionItem.classList.add('prescription-item');
      
      // 創建處方標題容器
      const prescriptionHeader = document.createElement('div');
      prescriptionHeader.classList.add('prescription-header');
      
      // 創建處方標題
      const prescriptionTitle = document.createElement('h4');
      
      // 直接使用 predate 欄位
      console.log('處方資料:', prescription);
      console.log('處方 predate 值:', prescription.predate);
      
      // 計算藥品數量
      const medicationCount = prescription.medications && Array.isArray(prescription.medications) ? prescription.medications.length : 0;
      prescriptionTitle.textContent = `處方 #${index + 1} ${prescription.predate || 'N/A'} (${medicationCount} 項藥品)`;
      
      // 如果是第一筆處方（最新的），將標題文字變色
      if (index === 0) {
        prescriptionTitle.style.color = '#e74c3c'; // 紅色
        prescriptionTitle.style.fontWeight = 'bold'; // 加粗
      }
      
      // 添加展開/收合圖標
      const toggleIcon = document.createElement('span');
      toggleIcon.classList.add('toggle-icon');
      toggleIcon.innerHTML = '&#9660;'; // 向下箭頭
      
      // 將標題和圖標添加到標題容器
      prescriptionHeader.appendChild(prescriptionTitle);
      prescriptionHeader.appendChild(toggleIcon);
      
      // 創建處方內容容器
      const prescriptionContent = document.createElement('div');
      prescriptionContent.classList.add('prescription-content');
      
      // 添加處方詳細資訊
      if (prescription._id) {
        const prescriptionInfo = document.createElement('p');
        prescriptionInfo.innerHTML = `<strong>處方 ID:</strong> ${prescription._id}`;
        if (prescription.details) {
          prescriptionInfo.innerHTML += `<br><strong>詳情:</strong> ${prescription.details}`;
        }
        prescriptionContent.appendChild(prescriptionInfo);
      }
      
      // 檢查是否有藥品資料
      if (prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
        // 創建藥品表格
        const table = document.createElement('table');
        table.style.width = '100%';
        
        // 添加表頭
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['藥品名稱', '健保碼', '頻率', '數量', '單價', '總成本'].forEach(text => {
          const th = document.createElement('th');
          th.textContent = text;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 添加表格內容
        const tbody = document.createElement('tbody');
        
        // 遍歷藥品
        prescription.medications.forEach(med => {
          const row = document.createElement('tr');
          
          // 藥品名稱
          const nameCell = document.createElement('td');
          nameCell.textContent = med.dname || 'N/A';
          row.appendChild(nameCell);
          
          // 健保碼
          const codeCell = document.createElement('td');
          codeCell.textContent = med.dinsuranceCode || 'N/A';
          row.appendChild(codeCell);
          
          // 頻率
          const freqCell = document.createElement('td');
          freqCell.textContent = med.frequency || 'N/A';
          row.appendChild(freqCell);
          
          // 數量
          const quantityCell = document.createElement('td');
          quantityCell.textContent = med.dcount || '0';
          row.appendChild(quantityCell);
          
          // 單價
          const priceCell = document.createElement('td');
          priceCell.textContent = (med.unitPrice || 0).toFixed(2);
          row.appendChild(priceCell);
          
          // 藥品總成本
          const costCell = document.createElement('td');
          const cost = med.totalCost || (med.unitPrice ? med.unitPrice * med.dcount : 0);
          costCell.textContent = cost.toFixed(2);
          row.appendChild(costCell);
          
          tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        prescriptionContent.appendChild(table);
      } else {
        const noMedsP = document.createElement('p');
        noMedsP.textContent = '無藥品資訊';
        prescriptionContent.appendChild(noMedsP);
      }
      
      // 將標題和內容添加到處方項目
      prescriptionItem.appendChild(prescriptionHeader);
      prescriptionItem.appendChild(prescriptionContent);
      
      // 添加點擊事件處理
      prescriptionHeader.addEventListener('click', function() {
        prescriptionContent.classList.toggle('active');
        toggleIcon.classList.toggle('active');
      });
      
      // 添加處方項目到日期分組
      dateGroup.appendChild(prescriptionItem);
    });
    
    // 添加日期分組到內容區域
    prescriptionHistoryContent.appendChild(dateGroup);
  });
}
