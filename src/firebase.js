import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDt19ZW20xqQ2g2riRU25ercdrIaxveu-Q",
  authDomain: "art-11.firebaseapp.com",
  projectId: "art-11",
  storageBucket: "art-11.firebasestorage.app",
  messagingSenderId: "527883467398",
  appId: "1:527883467398:web:1e84899251263a81ffaf07",
  measurementId: "G-E0SRGJWL68"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app); // Đảm bảo Analytics đã được khởi tạo đúng

export const googleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return user;
  } catch (error) {
    console.error("Lỗi đăng nhập Google", error);
    return null;
  }
};
