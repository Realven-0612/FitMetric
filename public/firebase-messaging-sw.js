importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "fitmetric-rv26",
  appId: "1:310038205585:web:bd03dcd958eef1f8869b30",
  apiKey: "AIzaSyCdvwkcsCnkGWp23v4vzP6yYzlMQkn1XEY",
  authDomain: "fitmetric-rv26.firebaseapp.com",
  storageBucket: "fitmetric-rv26.firebasestorage.app",
  messagingSenderId: "310038205585",
  measurementId: ""
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  if (payload.notification) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/assets/app_icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
