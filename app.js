const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io"); // Import Server from socket.io

const app = express();
const port = 3001;

// MongoDB Connection URI
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

// Create HTTP server and bind to Express
const server = http.createServer(app);
// Initialize Socket.IO
const io = new Server(server);

// Set EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const formatDate = require('./utils/formatDate');

// Routers (existing ones)
const calculateRouter = require('./routes/calculate');
const searchByDateRouter = require('./routes/searchByDate');
const customerTimeChartRouter = require('./routes/customerTimeChart');
const searchPrescriptionsRouter = require('./routes/searchPrescriptions');
const searchPrescriptionRouter = require('./routes/searchPrescription');
const searchByInsuranceCodeRouter = require('./routes/searchByInsuranceCode');
const updatePrescriptionRouter = require('./routes/updatePrescription');
const updatePatientRouter = require('./routes/updatePatient');
const getReportsRouter = require('./routes/getReports');
const getReportsAgeRouter = require('./routes/getReportsAge');
const calendarRoute = require('./routes/calendar');
const weeksRoute = require('./routes/weeks');
const dashboardRoute = require('./routes/dashboard');
const managePrescriptionsRoute = require('./routes/managePrescriptions');
const managePrescriptions2Route = require('./routes/managePrescriptions2');
const ordersRouter = require('./routes/orders');
const ordersresultRouter = require('./routes/ordersresult');
const orderskeyinRouter = require('./routes/orderskeyin');
const stockRouter = require('./routes/stock');
const ganttRouter = require('./routes/gantt');
const filterRouter = require('./routes/filter');
const resultRouter = require('./routes/result');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Existing Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/search', (req, res) => {
  res.render('search');
});

app.get('/search2', (req, res) => {
  res.render('search2');
});

// New route for real-time prescriptions page
app.get('/realtime-prescriptions', async (req, res) => {
  let initialPrescriptions = [];
  try {
    await client.connect();
    const db = client.db("pharmacy");
    // Fetch some recent prescriptions to display initially, e.g., last 10, sorted by date
    initialPrescriptions = await db.collection("prescriptions").find().sort({ date: -1 }).limit(10).toArray();
  } catch (e) {
    console.error("Error fetching initial prescriptions:", e);
  } finally {
    // Do not close client here if it's used by socket connections or other parts of the app continuously
    // await client.close(); // Consider connection pooling or persistent connection for MongoDB
  }
  res.render('realtime_prescriptions', { title: '即時處方狀態', initialPrescriptions: initialPrescriptions });
});

// API endpoint for premongo to notify of new prescriptions
app.post('/api/notify-prescription-update', (req, res) => {
  const newPrescription = req.body;
  console.log('Received new prescription via API:', newPrescription);
  // Emit the new prescription data to all connected clients
  io.emit('prescription_update', newPrescription);
  res.status(200).send({ message: 'Notification received and broadcasted' });
});

// Use existing routers
app.use('/calculate', calculateRouter);
app.use('/searchByDate', searchByDateRouter);
app.use('/customer-time-chart', customerTimeChartRouter);
app.use('/searchPrescriptions', searchPrescriptionsRouter);
app.use('/searchPrescription', searchPrescriptionRouter);
app.use('/searchByInsuranceCode', searchByInsuranceCodeRouter);
app.use('/updatePrescription', updatePrescriptionRouter);
app.use('/updatePatient', updatePatientRouter);
app.use('/getReports', getReportsRouter);
app.use('/getReportsAge', getReportsAgeRouter);
app.use('/calendar', calendarRoute);
app.use('/weeks', weeksRoute);
app.use('/dashboard', dashboardRoute);
app.use('/manageprescription', managePrescriptionsRoute);
app.use('/manageprescription2', managePrescriptions2Route);
app.use('/orders', ordersRouter);
app.use('/ordersresult', ordersresultRouter);
app.use('/orderskeyin', orderskeyinRouter);
app.use('/stock', stockRouter);
app.use('/gantt', ganttRouter);
app.use('/filter', filterRouter);
app.use('/result', resultRouter);

app.post('/delete/:id', async (req, res) => {
  const prescriptionId = req.params.id;
  try {
    await client.connect(); // Ensure client is connected before operation
    const db = client.db("pharmacy");
    const result = await db.collection("prescriptions").deleteOne({ _id: new ObjectId(prescriptionId) });
    if (result.deletedCount === 1) {
      res.status(200).send({ message: 'Prescription deleted successfully' });
    } else {
      res.status(404).send({ message: 'Prescription not found' });
    }
  } catch (e) {
    console.error("Error deleting prescription:", e);
    res.status(500).send({ message: 'Server error, unable to delete prescription' });
  } finally {
    // await client.close(); // Consider connection management strategy
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected to Socket.IO');
  // Optionally, send initial data upon connection if not handled by the EJS template server-side rendering
  // async function sendInitialData() {
  //   try {
  //     await client.connect();
  //     const db = client.db("pharmacy");
  //     const prescriptions = await db.collection("prescriptions").find().sort({ date: -1 }).limit(10).toArray();
  //     socket.emit('initial_prescriptions', prescriptions);
  //   } catch (e) {
  //     console.error("Error fetching initial prescriptions for socket:", e);
  //   } finally {
  //     // await client.close();
  //   }
  // }
  // sendInitialData();

  socket.on('disconnect', () => {
    console.log('User disconnected from Socket.IO');
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Real-time prescriptions page available at http://localhost:${port}/realtime-prescriptions`);
});
