const express = require('express');
const router = express.Router();
const moment = require('moment');
const client = require('../utils/db'); // MongoDB client

// --- Helper Functions for Data Fetching and Processing ---

/**
 * Fetches and processes prescription data for the last 8 weeks.
 * @param {object} prescriptionsCollection - MongoDB collection object.
 * @returns {Promise<{datesInWeeks: Array, weeklySums: Array}>}
 * @description Fetches daily prescription counts for the past 8 weeks, groups them weekly, and calculates weekly sums.
 */
async function getWeeklyPrescriptionData(prescriptionsCollection) {
    // Calculate date range for the last 8 weeks
    const endDate = moment();
    const startDate = moment().subtract(8 * 7 - 1, 'days'); // 8 weeks, 7 days each, -1 for inclusive start

    const endDateFormatted = endDate.format('YYYYMMDD');
    const startDateFormatted = startDate.format('YYYYMMDD');

    // MongoDB aggregation pipeline to get daily counts within the date range
    const aggregationPipeline = [
        {
            $match: {
                predate: { $gte: startDateFormatted, $lte: endDateFormatted }
            }
        },
        {
            $group: {
                _id: { date: "$predate" },
                prescriptionCount: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.date": 1 } // Sort by date
        }
    ];

    const dailyCounts = await prescriptionsCollection.aggregate(aggregationPipeline).toArray();

    // Process daily counts into weekly structure
    const datesInWeeks = [];
    const weeklySums = [];
    const dailyDataMap = new Map(dailyCounts.map(d => [d._id.date, d.prescriptionCount]));

    for (let week = 0; week < 8; week++) {
        const weekData = [];
        let weekSum = 0;
        for (let day = 0; day < 7; day++) {
            const currentDate = moment(startDate).add(week * 7 + day, 'days');
            const currentDateFormatted = currentDate.format('YYYYMMDD');
            const prescriptionCount = dailyDataMap.get(currentDateFormatted) || 0;

            weekData.push({
                date: currentDate.format('YYYY-MM-DD'), // Format for display/use in charts
                value: prescriptionCount
            });
            weekSum += prescriptionCount;
        }
        datesInWeeks.push(weekData);
        weeklySums.push(weekSum);
    }

    return { datesInWeeks, weeklySums };
}

/**
 * Fetches and processes prescription data for a specific month (calendar view).
 * @param {object} prescriptionsCollection - MongoDB collection object.
 * @param {number} year - The target year.
 * @param {number} month - The target month (0-indexed for Moment.js).
 * @returns {Promise<{datesInMonth: Array, monthlyTotal: number, averageDailyPrescriptions: string}>}
 * @description Fetches daily prescription counts for the given month and calculates monthly total and average.
 */
async function getMonthlyPrescriptionData(prescriptionsCollection, year, month) {
    const firstDateOfMonth = moment([year, month]).startOf('month').format('YYYYMMDD');
    const lastDateOfMonth = moment([year, month]).endOf('month').format('YYYYMMDD');

    // MongoDB aggregation pipeline for monthly data
    const aggregationPipeline = [
        {
            $match: {
                predate: { $gte: firstDateOfMonth, $lte: lastDateOfMonth }
            }
        },
        {
            $group: {
                _id: { date: "$predate" },
                prescriptionCount: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.date": 1 }
        }
    ];

    const dailyCounts = await prescriptionsCollection.aggregate(aggregationPipeline).toArray();
    const dailyDataMap = new Map(dailyCounts.map(d => [d._id.date, d.prescriptionCount]));

    const datesInMonth = [];
    let totalPrescriptionsInMonth = 0;
    let daysWithPrescriptions = 0;
    const daysInMonthCount = moment([year, month]).daysInMonth();

    for (let day = 1; day <= daysInMonthCount; day++) {
        const currentDate = moment([year, month]).date(day);
        const currentDateFormatted = currentDate.format('YYYYMMDD');
        const prescriptionCount = dailyDataMap.get(currentDateFormatted) || 0;

        datesInMonth.push({
            date: currentDateFormatted, // YYYYMMDD format for EJS logic
            value: prescriptionCount
        });

        if (prescriptionCount > 0) {
            totalPrescriptionsInMonth += prescriptionCount;
            daysWithPrescriptions++;
        }
    }

    const averageDailyPrescriptions = daysWithPrescriptions > 0 ? (totalPrescriptionsInMonth / daysWithPrescriptions).toFixed(2) : "0.00";
    
    return { datesInMonth, monthlyTotal: totalPrescriptionsInMonth, averageDailyPrescriptions };
}

/**
 * Fetches prescription times (HH:MM format) for the current day.
 * @param {object} prescriptionsCollection - MongoDB collection object.
 * @returns {Promise<Array<string>>} - Array of time strings.
 * @description Retrieves 'presec' field for all prescriptions dated today.
 */
async function getCurrentDayPrescriptionTimes(prescriptionsCollection) {
    const todayFormatted = moment().format('YYYYMMDD');
    // Find prescriptions for today and project only the 'presec' field
    const prescriptionsToday = await prescriptionsCollection
        .find({ predate: todayFormatted })
        .project({ presec: 1, _id: 0 }) // Only fetch presec, exclude _id
        .toArray();

    return prescriptionsToday.map(p => p.presec); // Assuming presec is the time string like HH:MM
}

// --- Main Route Handler for /dashboard/:year/:month ---

router.get('/:year/:month', async (req, res) => {
    try {
        // Validate year and month parameters
        const year = parseInt(req.params.year, 10);
        const month = parseInt(req.params.month, 10); // Month from URL is 1-indexed

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1900 || year > 2200) {
            return res.status(400).send("Invalid year or month parameter. Year should be between 1900-2200, month between 1-12.");
        }
        const month0Indexed = month -1; // Moment.js months are 0-indexed

        await client.connect();
        const db = client.db("pharmacy");
        const prescriptionsCollection = db.collection("prescriptions");
        
        // Parallelize data fetching for improved performance
        const [weeklyData, monthlyData, dailyTimes] = await Promise.all([
            getWeeklyPrescriptionData(prescriptionsCollection),
            getMonthlyPrescriptionData(prescriptionsCollection, year, month0Indexed),
            getCurrentDayPrescriptionTimes(prescriptionsCollection)
        ]);

        // Render the dashboard template with fetched data
        res.render('dashboard', {
            // Data for monthly calendar view
            datesInMonth: monthlyData.datesInMonth,
            // monthlyTotal: monthlyData.monthlyTotal, // This is calculated in EJS, can be passed if needed
            // averageDailyPrescriptions: monthlyData.averageDailyPrescriptions, // Also calculated in EJS

            // Data for weekly chart (last 8 weeks)
            datesInWeeks: weeklyData.datesInWeeks,
            weeklySums: weeklyData.weeklySums,

            // Data for today's prescription times chart
            times: dailyTimes,
            
            // Utilities and parameters for the template
            moment: moment, // Pass moment utility to the template
            currentYear: year, // Pass current year for navigation/display
            currentMonth: month // Pass current month (1-indexed) for navigation/display
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Provide a user-friendly error message
        res.status(500).send("An error occurred while fetching dashboard data. Please try again later.");
    } finally {
        // Ensure the client connection is closed
        if (client && client.topology && client.topology.isConnected()) {
            await client.close();
        }
    }
});

module.exports = router;

