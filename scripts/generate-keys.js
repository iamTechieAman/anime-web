const webpush = require('web-push');

console.log("Generating new VAPID Keys for Web Push Notifications...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("Add the following lines to your .env or .env.local file:");
console.log("-------------------------------------------------------");
console.log(`NEXT_PUBLIC_VAPID_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("-------------------------------------------------------");
console.log("\nNote: Keep the private key secure! Never commit it to GitHub.");
