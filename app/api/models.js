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

/**
 * Message schema - stores a single direct message between two users.
 * Fields:
 * - senderId: ObjectId (ref User)
 * - receiverId: ObjectId (ref User)
 * - text: String (optional)
 * - sentAt: Date
 * - attachments: array of files { type, url, filename, size, mimeType }
 */
// Fix: remove `_id` as a field inside the sub-schema; keep option `_id: false`
const attachmentSubSchema = new mongoose.Schema({
  type: { type: String }, // 'image' | 'audio' | other
  url: { type: String, required: true },
  filename: { type: String },
  size: { type: Number },
  mimeType: { type: String },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: false, default: "" }, // optional now
  sentAt: { type: Date, required: true, default: Date.now },
  attachments: { type: [attachmentSubSchema], default: [] },
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

const EthersTxSchema = new mongoose.Schema({
  userId: { type: String, index: true, default: null }, // optional link to your users
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  value: { type: String, required: true }, // store as string (wei)
  hash: { type: String, required: true, unique: true },
  chainId: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  timestamp: { type: Date, default: Date.now },
});

// ============= UPDATED POST SCHEMA =============
const postSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: { 
    type: String, 
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  images: [{ 
    type: String  // URLs to uploaded images
  }],
  tags: [{ 
    type: String,
    trim: true
  }],
  category: { 
    type: String, 
    enum: ["art", "project", "thought", "event", "announcement", "other"],
    default: "thought"
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  comments: [{  // Array of comment references
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Comment" 
  }],
  commentsCount: { 
    type: Number, 
    default: 0 
  },
  isPublic: { 
    type: Boolean, 
    default: true 
  },
  views: { 
    type: Number, 
    default: 0 
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});
// ============= END UPDATED POST SCHEMA =============

// ============= NEW COMMENT SCHEMA =============
const commentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  content: { 
    type: String, 
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  post: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Post", 
    required: true 
  },
  likes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for like count on comment
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Admin schema
import bcrypt from "bcrypt";
const adminSchema = new mongoose.Schema({
  pseudo: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "admin"
  }
});


// Middleware pour hasher le mot de passe avant save
adminSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer le mot de passe
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


/**
 * Avoid model overwrite in dev / hot-reload environments
 */
const User = mongoose.models.User || mongoose.model("User", userSchema);
const Post = mongoose.models.Post || mongoose.model("Post", postSchema);
const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
const Friend = mongoose.models.Friend || mongoose.model("Friend", friendSchema);
const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
const EthersTx = mongoose.models.EthersTx || mongoose.model('EthersTx', EthersTxSchema);
const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

/**
 * Ensure connection is established when this module is imported.
 */
connectToDatabase().catch((err) => {
  console.error("Failed to connect to MongoDB", err);
});

export { User, Post, Message, Friend, Wallet, EthersTx, Transaction, Comment, Admin, connectToDatabase };