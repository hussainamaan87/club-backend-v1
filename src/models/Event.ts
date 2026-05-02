import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true },

    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true
    },

    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true
    },

    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },

    capacity: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    hosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
      }
    ],

    banner: String,
    bannerPublicId: String,

    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },

    favoriteCount: {
  type: Number,
  default: 0,
  index: true
},
    trendingScore: {
      type: Number,
      default: 0,
      index: true
    }
  },
  { timestamps: true }
);

/* 🔥 INDEXES FOR PERFORMANCE */
schema.index({ cityId: 1, startTime: 1 });
schema.index({ categoryId: 1, startTime: 1 });
schema.index({ isFeatured: 1, startTime: 1 });
schema.index({ trendingScore: -1 });
schema.index({ hosts: 1 });

export default mongoose.model("Event", schema);