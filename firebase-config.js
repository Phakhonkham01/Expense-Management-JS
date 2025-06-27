// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyARaEo61U-dTZTYxb9r8JKO3ESwCQwPlIo",
  authDomain: "learn-indonesian.firebaseapp.com",
  projectId: "learn-indonesian",
  storageBucket: "learn-indonesian.appspot.com",
  messagingSenderId: "61342559557",
  appId: "1:61342559557:web:dff4d03cef9fb5cf1b222c",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
