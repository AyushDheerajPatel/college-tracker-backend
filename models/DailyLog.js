const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'BUNKED', 'TEACHER_ABSENT'],
      required: true,
    },
    topicTaught: {
      type: String,
      default: '',
      trim: true,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    absenceReason: {
      type: String,
      default: '',
      trim: true,
    },
    appliedToRestOfDay: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DailyLog', dailyLogSchema);
