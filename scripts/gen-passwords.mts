import bcrypt from 'bcryptjs';

const BCRYPT_COST_FACTOR = 10;

const users = [
  { email: 'super@example.com', password: 'superadmin123' },
  { email: 'admin@abcresidence.mn', password: 'admin123' },
  { email: 'operator@abcresidence.mn', password: 'operator123' },
  { email: 'bat.erdeneb@example.mn', password: 'resident123' },
];

async function main() {
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, BCRYPT_COST_FACTOR);
    console.log(`-- ${user.email} : ${user.password}`);
    console.log(`-- hash: ${hash}`);
    console.log('');
  }
}

main().catch(console.error);
