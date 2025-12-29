// hashPassword.js
import bcrypt from "bcryptjs";

const plainPassword = "1234";

const hashed = await bcrypt.hash(plainPassword, 10); // 10 = salt rounds
console.log(hashed);
