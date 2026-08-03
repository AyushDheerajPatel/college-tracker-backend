const express = require('express');
const router = express.Router();
const DailyLog = require('../models/DailyLog');
const authMiddleware = require('../middleware/auth');

// Protect all attendance routes with authentication middleware
router.use(authMiddleware);

// @route   GET /api/attendance
// @desc    Fetch user's attendance logs overview / API status
// @access  Private
router.get('/', async (req, res) => {
  try {
    const logs = await DailyLog.find({ user: req.user.id }).sort({ date: -1 }).limit(50);
    return res.status(200).json({
      success: true,
      message: 'Attendance API',
      endpoints: {
        today: 'GET /api/attendance/today',
        stats: 'GET /api/attendance/stats',
        log: 'POST /api/attendance/log',
      },
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('❌ [GET / Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching attendance logs.',
      error: error.message,
    });
  }
});

// @route   GET /api/attendance/stats
// @desc    Calculate attendance percentage and 75% warning status per subject for authenticated user
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const logs = await DailyLog.find({ user: req.user.id }).sort({ date: 1 });

    // Group logs by subject
    const subjectMap = {};

    logs.forEach((log) => {
      const subject = log.subject;
      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          subject,
          totalClasses: 0,
          attendedClasses: 0,
          bunkedClasses: 0,
          absentClasses: 0,
          teacherAbsentClasses: 0,
        };
      }

      if (log.status === 'PRESENT') {
        subjectMap[subject].attendedClasses += 1;
        subjectMap[subject].totalClasses += 1;
      } else if (log.status === 'BUNKED') {
        subjectMap[subject].bunkedClasses += 1;
        subjectMap[subject].totalClasses += 1;
      } else if (log.status === 'ABSENT') {
        subjectMap[subject].absentClasses += 1;
        subjectMap[subject].totalClasses += 1;
      } else if (log.status === 'TEACHER_ABSENT') {
        subjectMap[subject].teacherAbsentClasses += 1;
      }
    });

    const statsList = Object.values(subjectMap).map((sub) => {
      const percentage =
        sub.totalClasses > 0
          ? Math.round((sub.attendedClasses / sub.totalClasses) * 100)
          : 100;
      const isBelow75 = percentage < 75;

      return {
        ...sub,
        percentage,
        isBelow75,
      };
    });

    // Overall aggregate stats across all subjects
    let grandTotalClasses = 0;
    let grandAttendedClasses = 0;
    let grandBunkedClasses = 0;
    let grandAbsentClasses = 0;

    statsList.forEach((s) => {
      grandTotalClasses += s.totalClasses;
      grandAttendedClasses += s.attendedClasses;
      grandBunkedClasses += s.bunkedClasses;
      grandAbsentClasses += s.absentClasses;
    });

    const overallPercentage =
      grandTotalClasses > 0
        ? Math.round((grandAttendedClasses / grandTotalClasses) * 100)
        : 100;

    console.log(`📊 [GET /stats] User ${req.user.id}: Calculated stats for ${statsList.length} subjects. Overall: ${overallPercentage}%`);

    return res.status(200).json({
      success: true,
      overallPercentage,
      grandTotalClasses,
      grandAttendedClasses,
      grandBunkedClasses,
      grandAbsentClasses,
      data: statsList,
    });
  } catch (error) {
    console.error('❌ [GET /stats Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating attendance stats.',
      error: error.message,
    });
  }
});

// @route   POST /api/attendance/log
// @desc    Log or update attendance for a specific date and subject for authenticated user
// @access  Private
router.post('/log', async (req, res) => {
  console.log(`📥 [POST /api/attendance/log] Request from user ${req.user.id}:`, JSON.stringify(req.body, null, 2));
  try {
    const {
      date,
      subject,
      status,
      topicTaught,
      mediaUrls,
      absenceReason,
      appliedToRestOfDay,
    } = req.body;

    if (!date || !subject || !status) {
      console.warn('⚠️ [POST /log] Validation Failed: Missing required fields (date, subject, status). Received:', { date, subject, status });
      return res.status(400).json({
        success: false,
        message: 'Date, subject, and status are required fields.',
        received: { date, subject, status },
      });
    }

    // Normalize date to start of day & end of day for matching
    const logDate = new Date(date);
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(logDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Upsert query filter by user, date range, and subject
    const filter = {
      user: req.user.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      subject: subject,
    };

    const update = {
      user: req.user.id,
      date: logDate,
      subject,
      status,
      topicTaught: topicTaught || '',
      mediaUrls: mediaUrls || [],
      absenceReason: absenceReason || '',
      appliedToRestOfDay: Boolean(appliedToRestOfDay),
    };

    const options = { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true };

    console.log('🔄 [POST /log] Executing DailyLog.findOneAndUpdate with filter:', JSON.stringify(filter));
    const dailyLog = await DailyLog.findOneAndUpdate(filter, update, options);
    console.log('✅ [POST /log] Successfully saved log to MongoDB:', JSON.stringify(dailyLog, null, 2));

    if (appliedToRestOfDay) {
      console.log(`[INFO] appliedToRestOfDay set to true for subject '${subject}' on ${date}.`);
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance log saved successfully.',
      data: dailyLog,
    });
  } catch (error) {
    console.error('❌ [POST /log Error]:', error.name, error.message);
    if (error.errors) {
      console.error('❌ [POST /log Validation Errors Detail]:', JSON.stringify(error.errors, null, 2));
    }
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      message: 'Server error while logging attendance.',
      error: error.message,
      errorName: error.name,
      validationErrors: error.errors || null,
    });
  }
});

// @route   GET /api/attendance/today
// @desc    Fetch all DailyLog records for current date for authenticated user
// @access  Private
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const logs = await DailyLog.find({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    }).sort({ date: 1 });

    console.log(`📋 [GET /today] Found ${logs.length} logs for user ${req.user.id} today.`);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('❌ [GET /today Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching today attendance logs.',
      error: error.message,
    });
  }
});

// @route   GET /api/attendance/history/:date
// @desc    Fetch all DailyLog records for a specific date (YYYY-MM-DD) for authenticated user
// @access  Private
router.get('/history/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required.',
      });
    }

    const logDate = new Date(date);
    if (isNaN(logDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD.',
      });
    }

    const startDate = new Date(logDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(logDate);
    endDate.setHours(23, 59, 59, 999);

    const logs = await DailyLog.find({
      user: req.user.id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    console.log(`📅 [GET /history/${date}] Found ${logs.length} logs for user ${req.user.id}.`);

    return res.status(200).json(logs);
  } catch (error) {
    console.error(`❌ [GET /history/${req.params.date} Error]:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching history attendance logs.',
      error: error.message,
    });
  }
});

module.exports = router;
