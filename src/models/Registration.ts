import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN'],
      default: 'PENDING',
      index: true,
    },

    passCode: {
      type: String,
      index: true,
    },

    checkedInAt: {
      type: Date,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

schema.index({ userId: 1, eventId: 1 }, { unique: true });

schema.index(
  { passCode: 1 },
  {
    unique: true,
    sparse: true,
  }
);

schema.index({
  userId: 1,
  status: 1,
});

schema.index({
  eventId: 1,
  used: 1,
});

schema.index({
  eventId: 1,
  status: 1,
});

schema.index({
  eventId: 1,
  checkedInAt: -1,
});

export default mongoose.model('Registration', schema);
