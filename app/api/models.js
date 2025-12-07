import mongoose from "mongoose";
/**
 * Use an environment variable for the URI in production.
 * Fallback to the previous hard-coded URI for local dev if not set.
 */
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/SocialDB";

/**
 * Global cache for the connection (useful for serverless / dev hot-reload).
 * We attach to global so multiple module reloads reuse the same connection.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // options can be tuned as needed
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * Define schemas and models.
 * Use existing compiled models if present (mongoose.models).
 */

const locationSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  gender: { type: String, required: true },
  country: { type: String, required: true },
  pseudo: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  isValidated: { type: Boolean, default: false },
  location: { type: locationSchema, default: null },
  validationCode: { type: String, default: null },
  recoveryCode: { type: String, default: null },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  dateTime: { type: Date, required: true, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

/**
 * Message schema - stores a single direct message between two users.
 * Fields:
 * - senderId: ObjectId (ref User)
 * - receiverId: ObjectId (ref User)
 * - text: String
 * - sentAt: Date
 */
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  sentAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

/**
 * Friend (friendship) schema - stores friend requests and accepted/refused relationships
 * Fields:
 * - senderId: ObjectId (ref User)  -> the user who initiated the request
 * - receiverId: ObjectId (ref User) -> the user receiving the request
 * - status: String -> 'pending' | 'accepted' | 'refused'
 */
const friendSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "refused"], default: "pending" },
}, { timestamps: true });

/**
 * Wallet schema - stores a walletId related to a user and its balance
 * Fields:
 * - walletId: String (unique wallet identifier)
 * - userId: ObjectId (ref User)
 * - balance: Number
 */
const walletSchema = new mongoose.Schema({
  walletId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  balance: { type: Number, required: true, default: 0 },
}, { timestamps: true });

/**
 * Transaction schema - records transfers between wallets
 * Fields:
 * - senderWalletId: String (walletId of sender)
 * - receiverWalletId: String (walletId of receiver)
 * - amount: Number
 * - status: String (optional - pending/completed/failed)
 * - sentAt: Date
 */
const transactionSchema = new mongoose.Schema({
  senderWalletId: { type: String, required: true },
  receiverWalletId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  sentAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

/**
 * Avoid model overwrite in dev / hot-reload environments
 */
const User = mongoose.models.User || mongoose.model("User", userSchema);
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const Friend = mongoose.models.Friend || mongoose.model("Friend", friendSchema);
const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

/**
 * Ensure connection is established when this module is imported.
 */
connectToDatabase().catch((err) => {
  console.error("Failed to connect to MongoDB", err);
});

export { User, Post, Message, Friend, Wallet, Transaction, connectToDatabase };