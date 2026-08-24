import prisma from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function fixAdminPassword() {
  try {
    const email = 'princenegi8826@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log('Admin user not found with that email.');
      return;
    }

    // Check if the password is NOT a bcrypt hash (bcrypt hashes usually start with $2a$, $2b$, etc.)
    if (!user.password.startsWith('$2')) {
      console.log('Plain-text password detected. Encrypting now...');
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
      });
      
      console.log('Success! Your password is now properly encrypted.');
    } else {
      console.log('Password is already properly encrypted.');
    }
  } catch (error) {
    console.error('Error fixing password:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

fixAdminPassword();
