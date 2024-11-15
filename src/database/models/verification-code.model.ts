import mongoose, { Document, Schema } from "mongoose";
import { VerificationEnum } from "../../common/enums/verification-code.enum";

export interface VerificationCodeDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: VerificationEnum;
  expiresAt: Date;
  createdAt: Date;
}

const verificationCodeSchema = new Schema<VerificationCodeDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const VerificationCodeModel = mongoose.model<VerificationCodeDocument>(
  "VerificationCode",
  verificationCodeSchema,
  "verification_codes"
);

export default VerificationCodeModel;
