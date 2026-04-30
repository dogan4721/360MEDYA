// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyCtSpmTP9_i-s2ZL2rC1ozVx6uPu68kVCs",
    authDomain: "smm-panel-f2947.firebaseapp.com",
    databaseURL: "https://smm-panel-f2947-default-rtdb.firebaseio.com",
    projectId: "smm-panel-f2947",
    storageBucket: "smm-panel-f2947.firebasestorage.app",
    messagingSenderId: "758065772278",
    appId: "1:758065772278:web:a94d37b0ff892583e81ed7"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();