// 處方渲染相關功能
function renderPrescription(prescription) {
  prescriptionDetailsContainer.innerHTML = '';
  rightInfoBox.innerHTML = '';

  if (!prescription || Object.keys(prescription).length === 0) {
    prescriptionDetailsContainer.innerHTML = '<p class="no-data">等待處方資料更新...</p>';
    rightInfoBox.innerHTML = '<p class="no-data">尚無處方資訊</p>';
    currentPrescription = null;
    return;
  }
  
  // 更新當前處方資訊到全域變數
  currentPrescription = prescription;

  // 左側基本資訊 + 藥品表格
  const infoDiv = document.createElement('div');
  infoDiv.classList.add('prescription-info');

  let content = '';
  content += `<p><strong>病患姓名:</strong> ${prescription.patientName || prescription.name || 'N/A'}`;
  content += `<strong>   身分證字號:</strong> ${prescription.pid || 'N/A'}`;
  content += `<strong>   日期:</strong> ${prescription.date ? new Date(prescription.date).toLocaleString() : 'N/A'}</p>`;
  if (prescription.status) content += `<p><strong>狀態:</strong> ${prescription.status}</p>`;
  infoDiv.innerHTML = content;
  prescriptionDetailsContainer.appendChild(infoDiv);

  // 藥品表格
  if (prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');        
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    ['選取', '編號', '藥品名稱', '健保碼',  '頻率', '數量'].forEach(text => { // 添加選取列
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);     
    
    // 先對藥品進行排序，PRN排最下面，HS次之
    const sortedMedications = [...prescription.medications].sort((a, b) => {
      const freqA = a.frequency || 'N/A';
      const freqB = b.frequency || 'N/A';
      
      // PRN 排最後
      if (freqA === 'PRN' && freqB !== 'PRN') return 1;
      if (freqA !== 'PRN' && freqB === 'PRN') return -1;
      
      // HS 排次後
      if (freqA === 'HS' && freqB !== 'HS' && freqB !== 'PRN') return 1;
      if (freqA !== 'HS' && freqA !== 'PRN' && freqB === 'HS') return -1;
      
      // 其他情況維持原順序
      return 0;
    });
    
    // 使用排序後的藥品陣列，並帶入索引，以便加入編號
    sortedMedications.forEach((med, index) => {
      const row = document.createElement('tr');
      row.dataset.medicationIndex = index; // 儲存藥品索引
      row.dataset.medicationId = med._id || ''; // 儲存藥品ID
      row.dataset.medicationName = med.dname || 'N/A'; // 儲存藥品名稱
      row.dataset.medicationCode = med.dinsuranceCode || 'N/A'; // 儲存健保碼
      
      const number = index + 1; // 從1開始的編號
      const name = med.dname || 'N/A';
      const code = med.dinsuranceCode || 'N/A';
      const frequency = med.frequency || 'N/A'; // Added frequency data
      const quantity = med.dcount || 0;
      
      // 檢查頻率是否為PRN或HS，設定對應底色
      if (frequency === 'PRN') {
        row.style.backgroundColor = '#e6f7ff'; // 淺藍色背景
      } else if (frequency === 'HS') {
        row.style.backgroundColor = '#ffe6cc'; // 淺橘色背景
      }
      
      // 新增選取按鈕
      const selectTd = document.createElement('td');
      const selectBtn = document.createElement('button');
      selectBtn.textContent = '選取';
      selectBtn.className = 'select-medication-btn';
      
      // 添加選取按鈕點擊事件
      selectBtn.addEventListener('click', function(event) {
        // 防止事件冒泡
        event.preventDefault();
        event.stopPropagation();
        
        console.log('選取按鈕被點擊');
        
        const medicationData = {
          id: med._id || '',
          name: med.dname || 'N/A',
          code: med.dinsuranceCode || 'N/A',
          frequency: med.frequency || 'N/A',
          quantity: med.dcount || 0,
          prescriptionId: prescription._id || '',
          patientName: prescription.patientName || prescription.name || 'N/A',
          patientId: prescription.pid || 'N/A'
        };
        
        // 發送選取藥品事件到伺服器
        socket.emit('medication_review_request', medicationData);
        console.log('已發送藥品覆核請求:', medicationData);
        
        // 直接顯示本地對話框，不等待廣播
        showReviewModal(medicationData);
      });
      
      selectTd.appendChild(selectBtn);
      row.appendChild(selectTd);
      
      // 將編號加入資料陣列的第一個位置
      [number, name, code, frequency, quantity].forEach(text => { // Added number and frequency to row data
        const td = document.createElement('td');
        td.textContent = text;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    prescriptionDetailsContainer.appendChild(table);
  } else {
    const noMedsP = document.createElement('p');
    noMedsP.textContent = '無藥品資訊。';
    prescriptionDetailsContainer.appendChild(noMedsP);
  }

  // 右側顯示「處方 ID」與「詳情」
  let rightContent = '';
  if (prescription.plusday && prescription.plusday !== 0) {
    const plusdayDisplay = `+++${prescription.plusday}天+++`;
    rightContent += `<p><strong style="color: red;">特殊註記 :</strong> ${plusdayDisplay}</p>`;
  }
  rightContent += `<p><strong>處方 ID:</strong> ${prescription._id || 'N/A'}</p>`;
  if (prescription.details) rightContent += `<p><strong>詳情:</strong> ${prescription.details}</p>`;
  rightInfoBox.innerHTML = rightContent;

  // 在渲染完成後自動儲存為PNG
  saveLeftColumnAsPNG(prescription);
  
  // 處方丟入時自動執行查詢紀錄功能
  fetchPrescriptionHistory();
}

// 自動將左側區域儲存為PNG的函數
function saveLeftColumnAsPNG(prescription) {
  // 確保有處方資料才進行截圖
  if (!prescription || Object.keys(prescription).length === 0) {
    return;
  }

  // 使用setTimeout確保DOM已完全渲染
  setTimeout(() => {
    html2canvas(leftColumn, {
      backgroundColor: '#fff',
      scale: 2, // 提高解析度
      logging: false,
      useCORS: true
    }).then(canvas => {
      // 創建下載連結
      const link = document.createElement('a');
      // 使用處方ID和時間戳作為檔名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const patientName = prescription.patientName || prescription.name || 'unknown';
      const fileName = `處方_${patientName}_${timestamp}.png`;
      
      // 將canvas轉換為blob並下載
      canvas.toBlob(function(blob) {
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        // 釋放URL物件
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      }, 'image/png');
    }).catch(err => {
      console.error('截圖過程中發生錯誤:', err);
    });
  }, 500); // 等待500毫秒確保DOM已渲染完成
}
