// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDnrVqhgI7zN73dnTR-Wq8EmG7_RUZKyN8",
  authDomain: "solana-b7b9d.firebaseapp.com",
  databaseURL: "https://solana-b7b9d-default-rtdb.firebaseio.com", // Thêm URL Realtime Database
  projectId: "solana-b7b9d",
  storageBucket: "solana-b7b9d.firebasestorage.app",
  messagingSenderId: "18648790776",
  appId: "1:18648790776:web:ba2ccdaf3a3a3284582d0d"
};

// Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// Kết nối đến Realtime Database
const database = getDatabase(app);

// Hàm để tạo bản ghi
export const createRecord = (path, data) => {
  set(ref(database, path), data)
    .then(() => {
      console.log("Dữ liệu được ghi thành công!");
    })
    .catch((error) => {
      console.error("Lỗi khi ghi dữ liệu:", error);
    });
};
