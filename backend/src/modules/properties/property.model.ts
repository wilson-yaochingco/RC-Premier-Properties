import mongoose, { Schema, type Model } from "mongoose";
import { randomUUID } from "node:crypto";
import {
  FEATURED_PROPERTY_ORDER_MAX,
  FEATURED_PROPERTY_ORDER_MIN,
  LISTING_PURPOSES,
  PROPERTY_AVAILABILITY,
  PROPERTY_PUBLICATION_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_MEDIA_KINDS,
  PROPERTY_MEDIA_SOURCES,
  PUBLIC_LOCATION_PRECISIONS,
  type PublicMapPoint,
} from "@rc/shared";
import type { PropertyEntity } from "./property.types.js";

const mediaSchema = new Schema(
  {
    id: { type: String, required: true, default: randomUUID, maxlength: 80 },
    kind: {
      type: String,
      enum: PROPERTY_MEDIA_KINDS,
      required: true,
    },
    url: { type: String, trim: true, required: true, maxlength: 2_048 },
    alt: { type: String, trim: true, required: true, maxlength: 240 },
    caption: { type: String, trim: true, maxlength: 500 },
    source: {
      type: String,
      enum: PROPERTY_MEDIA_SOURCES,
      required: true,
      default: "production",
    },
    sourceUrl: { type: String, trim: true, maxlength: 2_048 },
    attribution: { type: String, trim: true, maxlength: 160 },
    focalPoint: {
      type: new Schema(
        {
          x: { type: Number, required: true, min: 0, max: 100 },
          y: { type: Number, required: true, min: 0, max: 100 },
        },
        { _id: false },
      ),
    },
  },
  { _id: false },
);

const specificationsSchema = new Schema(
  {
    bedrooms: { type: Number, min: 0, max: 100 },
    bathrooms: { type: Number, min: 0, max: 100 },
    parkingSpaces: { type: Number, min: 0, max: 100 },
    lotAreaSqm: { type: Number, min: 0, max: 100_000_000 },
    floorAreaSqm: { type: Number, min: 0, max: 100_000_000 },
    storeys: { type: Number, min: 0, max: 100 },
    furnishing: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const publicMapPointSchema = new Schema<PublicMapPoint>(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(coordinates: number[]): boolean {
          if (coordinates.length !== 2) return false;
          const [longitude, latitude] = coordinates;
          return (
            typeof longitude === "number" &&
            Number.isFinite(longitude) &&
            typeof latitude === "number" &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
          );
        },
        message:
          "Public map coordinates must be [longitude, latitude] within valid ranges.",
      },
    },
  },
  { _id: false },
);

const privateCoordinatesSchema = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

const propertySchema = new Schema<PropertyEntity>(
  {
    propertyId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
      match: /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    purpose: { type: String, enum: LISTING_PURPOSES, required: true },
    propertyType: { type: String, enum: PROPERTY_TYPES, required: true },
    availability: {
      type: String,
      enum: PROPERTY_AVAILABILITY,
      required: true,
      default: "available",
    },
    publicationStatus: {
      type: String,
      enum: PROPERTY_PUBLICATION_STATUSES,
      required: true,
      default: "draft",
    },
    archiveRestoreStatus: {
      type: String,
      enum: ["draft", "unpublished"],
    },
    featured: { type: Boolean, required: true, default: false },
    featuredOrder: {
      type: Number,
      min: FEATURED_PROPERTY_ORDER_MIN,
      max: FEATURED_PROPERTY_ORDER_MAX,
      validate: {
        validator: Number.isInteger,
        message: "featuredOrder must be a whole number.",
      },
    },
    price: {
      amount: { type: Number, required: true, min: 0, max: 1_000_000_000_000 },
      currency: { type: String, enum: ["PHP"], required: true, default: "PHP" },
      negotiable: { type: Boolean, required: true, default: false },
    },
    location: {
      region: { type: String, trim: true, maxlength: 100 },
      province: { type: String, required: true, trim: true, maxlength: 100 },
      city: { type: String, required: true, trim: true, maxlength: 100 },
      barangay: { type: String, trim: true, maxlength: 100 },
      development: { type: String, trim: true, maxlength: 140 },
      publicPrecision: {
        type: String,
        enum: PUBLIC_LOCATION_PRECISIONS,
        required: true,
        default: "city-only",
      },
      publicPoint: { type: publicMapPointSchema },
      privateAddress: { type: String, trim: true, maxlength: 240, select: false },
      coordinates: { type: privateCoordinatesSchema, select: false },
    },
    specifications: { type: specificationsSchema, required: true, default: () => ({}) },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: { type: String, required: true, trim: true, maxlength: 10_000 },
    highlights: { type: [String], default: [] },
    amenities: { type: [String], default: [] },
    features: { type: [String], default: [] },
    coverMedia: { type: mediaSchema },
    gallery: { type: [mediaSchema], default: [] },
    internalNotes: { type: String, trim: true, select: false },
    ownerReference: { type: String, trim: true, select: false },
    publishedAt: {
      type: Date,
      required: function requiredForPublished(this: PropertyEntity): boolean {
        return this.publicationStatus === "published";
      },
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  },
);

propertySchema.index({ propertyId: 1 }, { unique: true });
propertySchema.index({ slug: 1 }, { unique: true });
propertySchema.index({ publicationStatus: 1, publishedAt: -1, _id: -1 });
propertySchema.index({
  publicationStatus: 1,
  purpose: 1,
  propertyType: 1,
  "price.amount": 1,
});
propertySchema.index({
  publicationStatus: 1,
  "location.province": 1,
  "location.city": 1,
});
propertySchema.index({
  publicationStatus: 1,
  "specifications.bedrooms": 1,
  "specifications.bathrooms": 1,
});
propertySchema.index({
  publicationStatus: 1,
  featured: 1,
  availability: 1,
  featuredOrder: -1,
  publishedAt: -1,
  _id: -1,
});

export const PropertyModel: Model<PropertyEntity> =
  (mongoose.models.Property as Model<PropertyEntity> | undefined) ??
  mongoose.model<PropertyEntity>("Property", propertySchema);
