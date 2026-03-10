import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
    const profs = await User.find({ role: 'professor' }).lean();
    console.log(`Total professors: ${profs.length}`);
    profs.forEach(p => {
        console.log(`- ${p.name || p.email}: isVerified=${p.isVerified}, status=${p.status}, isFeatured=${p.isFeatured}`);
    });
    mongoose.disconnect();
}
check();
