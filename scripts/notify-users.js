const mongoose = require('mongoose');
const webpush = require('web-push');

// Configuration from env
const MONGODB_URI = process.env.MONGODB_URI;
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;

if (!MONGODB_URI || !PUBLIC_VAPID_KEY || !PRIVATE_VAPID_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:contact@toonplayer.in',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

async function notifyUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    const payload = JSON.stringify({
      title: 'New Episode Available! 🍿',
      body: 'A highly anticipated new episode just dropped on ToonPlayer. Watch it now in HD!',
      url: 'https://toonplayer.in'
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        for (const sub of user.pushSubscriptions) {
          try {
            await webpush.sendNotification(sub, payload);
            sent++;
          } catch (error) {
            console.error('Error sending notification, removing invalid subscription...');
            failed++;
            // In a real app, you would remove the dead subscription here.
          }
        }
      }
    }

    console.log(`Finished sending notifications. Success: ${sent}, Failed: ${failed}`);
  } catch (err) {
    console.error("Failed to execute notify script:", err);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

notifyUsers();
