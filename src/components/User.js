import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiKey } from '../api';

const UserDashboard = ({ userData }) => {
  const [nfts, setNfts] = useState([]);

  useEffect(() => {
    const fetchNfts = async () => {
      try {
        const response = await axios.get(`https://api.gameshift.dev/nx/nfts/${userData.referenceId}`, {
          headers: {
            "x-api-key": apiKey,
          },
        });
        setNfts(response.data);
      } catch (err) {
        console.error("Lỗi tải NFT", err);
      }
    };

    if (userData?.referenceId) {
      fetchNfts();
    }
  }, [userData]);

  return (
    <div>
      <h3>Thông tin người dùng</h3>
      <p>Email: {userData.email}</p>
      <p>Reference ID: {userData.referenceId}</p>
      <h4>Các NFT của bạn</h4>
      {nfts.length > 0 ? (
        nfts.map((nft) => (
          <div key={nft.id}>
            <p>{nft.name}</p>
            <p>Giá: {nft.price} SOL</p>
          </div>
        ))
      ) : (
        <p>Chưa có NFT nào.</p>
      )}
    </div>
  );
};

export default UserDashboard;
