# 🌐 SolanaUDPM

SolanaUDPM là một dự án demo tích hợp các chức năng blockchain Solana vào một ứng dụng React. Dự án này giới thiệu cách sử dụng ví Solana, giao dịch token, và quản lý NFT trong một ứng dụng web hiện đại.

## 📋 Mục Lục

- [🌟 Tính Năng](#tính-năng)
- [⚙️ Cài Đặt](#cài-đặt)
- [🚀 Sử Dụng](#sử-dụng)
- [📜 Scripts](#scripts)
- [🔧 Cấu Hình](#cấu-hình)
- [📦 Dependencies](#dependencies)
- [🛠️ Dev Dependencies](#dev-dependencies)
- [🌍 Website](#live-website)

## 🌍 Live Website

```
https://udpm-solana-11.netlify.app/
```

## 🌟 Tính Năng

- 💼 **Tích Hợp Ví Solana**: Kết nối và tương tác với Phantom Wallet.
- 💱 **Giao Dịch Token**: Quản lý số dư SOL và USDC.
- 🖼️ **Quản Lý NFT**: Tạo, liệt kê, và quản lý NFT.
- 📱 **Thiết Kế Responsive**: Giao diện thân thiện với thiết bị di động sử dụng Bootstrap.
- 🔥 **Tích Hợp Firebase**: Xác thực người dùng và lưu trữ dữ liệu với Firebase.
- 🧭 **Hướng Dẫn Người Dùng**: Onboarding người dùng với Driver.js.

## ⚙️ Cài Đặt

1. Clone repository:
   ```sh
   git clone https://github.com/leonx04/SolanaUDPM.git
   cd solana-demo
   ```

2. Cài đặt các gói cần thiết:
   ```sh
   npm install
   ```

3. Tạo file cấu hình `.env` dựa trên file mẫu `.env.example`.

## 🚀 Sử Dụng

1. Khởi chạy ứng dụng:
   ```sh
   npm start
   ```

2. Mở trình duyệt và truy cập:
   ```
   http://localhost:3000
   ```

## 📜 Scripts

- `npm start`: Chạy ứng dụng ở chế độ phát triển. 🏗️
- `npm run build`: Build ứng dụng cho môi trường production. 📦
- `npm test`: Chạy các bài kiểm tra. ✅
- `npm run eject`: Gỡ bỏ cấu hình mặc định của React (không khuyến khích). ⚠️

## 🔧 Cấu Hình

Cấu hình các thông tin sau trong file `.env`:

- **Firebase Config**: Các thông số xác thực và database từ Firebase. 🔐
- **Solana Network**: Endpoint RPC của mạng Solana (ví dụ: `https://app.gameshift.dev/`). 🌐
- **API Keys**: Các khóa API cho các dịch vụ phụ trợ nếu cần(Game shift). 🔑

## 📦 Dependencies

Danh sách các dependencies chính:

- **React**: ^18.x ⚛️
- **Bootstrap**: ^5.x 🅱️
- **Solana/web3.js**: ^1.x 💎
- **Firebase**: ^9.x 🔥
- **Phantom Wallet Adapter**: ^1.x 👻

## 🛠️ Dev Dependencies

Danh sách các công cụ phát triển:

- **ESLint**: ^8.x 🕵️
- **Prettier**: ^2.x 💅
- **Driver.js**: ^0.x 🚦