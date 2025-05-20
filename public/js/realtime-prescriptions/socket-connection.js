// Socket.IO 連接與基本事件處理
const socket = io();
const prescriptionDetailsContainer = document.getElementById('prescriptionDetailsContainer');
const rightInfoBox = document.getElementById('rightInfoBox');
const leftColumn = document.getElementById('leftColumn');
const cancelBtn = document.getElementById('cancelBtn');
const modifyBtn = document.getElementById('modifyBtn');
const searchBtn = document.getElementById('searchBtn');

// 全域變數，用於存儲當前顯示的處方資訊
let currentPrescription = null;
let currentReviewData = null;

// 預加載音效
const cancelSound = new Audio('/sounds/cancel_alert.mp3');
const modifySound = new Audio('/sounds/modify_alert.mp3');

// Socket 連接事件
socket.on('connect', () => {
  console.log('Connected to Socket.IO server!');
});

// 接收初始處方資料
socket.on('initial_prescriptions', (initialDataArray) => {
  console.log('Received initial prescriptions:', initialDataArray);
  if (initialDataArray && initialDataArray.length > 0) {
    const latestInitial = initialDataArray.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
    renderPrescription(latestInitial);
  } else {
    prescriptionDetailsContainer.innerHTML = '<p class="no-data">目前無處方資料。</p>';
    rightInfoBox.innerHTML = '<p class="no-data">尚無處方資訊</p>';
  }
});

// 接收處方更新
socket.on('prescription_update', (newPrescription) => {
  console.log('Received prescription update:', newPrescription);
  renderPrescription(newPrescription);
});

// 斷開連接事件
socket.on('disconnect', () => {
  console.log('Disconnected from Socket.IO server.');
});
