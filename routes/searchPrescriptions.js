// routes/searchPrescriptions.js
const express = require('express');
const router = express.Router();
const client = require('../utils/db'); // 引入 MongoDB 客戶端

// 新增 API 端點，回傳 JSON 格式的處方資料
router.get('/api/patient-prescriptions', async (req, res) => {
  const pid = req.query.pid;
  let prescriptions = [];

  try {
    await client.connect();
    const db = client.db("pharmacy");
    const prescriptionsCollection = db.collection("prescriptions");
    const medicationsCollection = db.collection("medications");
    const patientsCollection = db.collection("patients");

    // 查找與 pid 匹配的處方
    prescriptions = await prescriptionsCollection.find({ pid: pid }).toArray();

    // 查找患者信息
    const patient = await patientsCollection.findOne({ pid: pid });

    // 查詢每張處方的藥品信息並計算總成本
    for (let prescription of prescriptions) {
      // 將 drug 欄位轉換為 medications 欄位，以符合前端期望的格式
      prescription.medications = prescription.drug ? prescription.drug.map(drug => {
        return {
          dname: drug.dname,
          dinsuranceCode: drug.dinsuranceCode,
          dcount: drug.dcount,
          frequency: drug.df,
          unitPrice: drug.unitPrice || 0,
          totalCost: drug.totalCost || 0
        };
      }) : [];
      
      // 計算每張處方的總成本
      prescription.prescriptionTotalCost = prescription.medications.reduce((total, med) => total + (med.totalCost || 0), 0);
    }

    // 回傳 JSON 格式的處方資料
    res.json(prescriptions);
  } catch (error) {
    console.error('查詢處方資料時出錯:', error);
    res.status(500).json({ error: '查詢處方資料時出錯' });
  } finally {
    await client.close();
  }
});

router.get('/', async (req, res) => {
  const pid = req.query.pid;
  let prescriptions = [];
  let prescriptionsByDate = {};

  try {
    await client.connect();
    const db = client.db("pharmacy");
    const prescriptionsCollection = db.collection("prescriptions");
    const medicationsCollection = db.collection("medications");
    const patientsCollection = db.collection("patients");

    // 查找與 pid 匹配的處方
    prescriptions = await prescriptionsCollection.find({ pid: pid }).toArray();

    // 查找患者信息
    const patient = await patientsCollection.findOne({ pid: pid });

    // 查詢每張處方的藥品信息並計算總成本
    for (let prescription of prescriptions) {
	
      for (let drug of prescription.drug) {
        const medication = await medicationsCollection.findOne({ dinsuranceCode: drug.dinsuranceCode });
        if (medication) {
          drug.dname = medication.dname;
          drug.dcost = medication.dcost;
          drug.totalCost = drug.dcount * drug.dcost;
        }
      }

      // 計算每張處方的總成本
      prescription.prescriptionTotalCost = prescription.drug.reduce((total, drug) => total + drug.totalCost, 0);

      // 按日期分類處方
      if (!prescriptionsByDate[prescription.predate]) {
        prescriptionsByDate[prescription.predate] = [];
      }
      prescriptionsByDate[prescription.predate].push(prescription);
    }

    // 渲染結果頁面，傳遞查詢結果
    res.render('result1', {
      prescriptions,
      prescriptionsByDate,
      patient: patient || {},
      pid: patient ? patient.pid : '未知',
      pname: patient ? patient.pname : '未知',
      pdate: patient ? patient.pdate : '',
      pvip: patient ? patient.pvip : '',
      pphone: patient ? patient.pphone : '',
      pline: patient ? patient.pline : '',
      pdetail: patient ? patient.pdetail : '',
      errorMessage: prescriptions.length > 0 ? null : '沒有找到相關處方信息',
    });
  } catch (error) {
    console.error(error);
    res.render('result1', { errorMessage: '查詢時出錯' });
  } finally {
    await client.close();
  }
});

module.exports = router;
