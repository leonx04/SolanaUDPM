# 🌐 SolanaUDPM

SolanaUDPM is a demo project that integrates Solana blockchain functionalities into a React application. This project showcases how to use Solana wallets, token transactions, and NFT management in a modern web application.

## 📋 Table of Contents

- [🌟 Features](#features)
- [⚙️ Installation](#installation)
- [🚀 Usage](#usage)
- [📜 Scripts](#scripts)
- [🔧 Configuration](#configuration)
- [📦 Dependencies](#dependencies)
- [🛠️ Dev Dependencies](#dev-dependencies)
- [🌍 Live Website](#live-website)

## 🌍 Live Website

```
https://udpm-solana-11.netlify.app/
```

## 🌟 Features

- 💼 **Solana Wallet Integration**: Connect and interact with Phantom Wallet.
- 💱 **Token Transactions**: Manage SOL and USDC balances.
- 🖼️ **NFT Management**: Create, list, and manage NFTs.
- 📱 **Responsive Design**: Mobile-friendly interface using Bootstrap.
- 🔥 **Firebase Integration**: User authentication and data storage with Firebase.
- 🧭 **User Onboarding**: Guide users through the application with Driver.js.
- 🔒 **Google OAuth**: Integrate Google Sign-In functionality.
- 🎨 **Styled Components**: Utilize styled-components for component-based styling.

## ⚙️ Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/leonx04/SolanaUDPM.git
   cd solana-demo
   ```

2. Install the required packages:
   ```sh
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template and add the following:
   ```
   REACT_APP_X_API_KEY=your_api_key_here
   REACT_APP_CLOUDINARY_API_KEY=your_cloudinary_api_key_here
   ```

## 🚀 Usage

1. Start the application:
   ```sh
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## 📜 Scripts

- `npm start`: Run the app in development mode using react-app-rewired. 🏗️
- `npm run build`: Build the app for production without source maps. 📦
- `npm test`: Run tests using react-app-rewired. ✅
- `npm run eject`: Eject from create-react-app configuration (not recommended). ⚠️

## 🔧 Configuration

- **Babel Config**: The project uses a custom Babel configuration for better browser compatibility and React support.
- **Webpack Config Override**: A custom webpack configuration is used to exclude certain packages from source map generation.
- **Environment Variables**: Set up in `.env` file for API keys and other sensitive information.

## 📦 Dependencies

Key dependencies include:

- **React**: ^18.2.0 ⚛️
- **Bootstrap**: ^5.3.3 🅱️
- **@solana/web3.js**: ^1.95.5 💎
- **Firebase**: ^11.0.2 🔥
- **React Router Dom**: ^6.28.0 🧭
- **Axios**: ^1.7.8 🌐
- **Driver.js**: ^1.3.1 🚦
- **Styled Components**: ^6.1.13 💅
- **Yup**: ^1.4.0 ✅

## 🛠️ Dev Dependencies

Development tools include:

- **React App Rewired**: ^2.2.1 🔧
- **ESLint**: ^8.50.0 🕵️
- **Babel**: Various Babel plugins and presets for advanced JavaScript features 🏗️
- **React Scripts**: ^5.0.1 📜

## 🌐 Browser Support

- **Production**: Targets modern browsers (defaults, not IE 11)
- **Development**: Last 2 versions of Chrome, Firefox, and Safari

## 🔐 Security Note

Remember to keep your API keys and sensitive information secure. Never commit your `.env` file to version control.
```

This updated README now includes more detailed information about the project's dependencies, development tools, browser support, and configuration files. 