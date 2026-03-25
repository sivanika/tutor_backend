import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB\n");
    const profs = await User.find({ role: 'professor', isVerified: true, status: 'active' }).lean();
    console.log(`Active verified professors: ${profs.length}\n`);
    profs.forEach(p => {
        console.log(`- ${p.name || p.email}`);
        console.log(`  hourlyRate: ${p.hourlyRate ?? '(not set)'}`);
        console.log(`  isFeatured: ${p.isFeatured}`);
        console.log('');
    });
    mongoose.disconnect();
}
check();
