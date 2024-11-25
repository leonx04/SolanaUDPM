import React, { useState, useEffect } from 'react';
import { apiKey } from '../api';

const ItemsTable = ({ ownerReferenceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://api.gameshift.dev/nx/items?ownerReferenceId=${ownerReferenceId}`, {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách items');
      }

      const data = await response.json();
      setItems(data.data || []);
    } catch (err) {
      setError('Lỗi khi tải items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerReferenceId) {
      fetchItems();
    }
  }, [ownerReferenceId]);

  // Hàm để rút gọn text
  const truncateText = (text, maxLength) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="card w-100">
      <div className="card-header bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Danh Sách Items</h5>
          <button
            onClick={fetchItems}
            className="btn btn-primary btn-sm"
          >
            <i className="fas fa-sync-alt me-1"></i> Làm mới
          </button>
        </div>
      </div>

      <div className="card-body p-0">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger m-3">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-5 text-muted">Không tìm thấy items</div>
        ) : (
          <div className="table-responsive">
            <style>
              {`
                @media (max-width: 768px) {
                  .table-responsive {
                    display: block;
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                  }
                  
                  .mobile-table-wrapper {
                    min-width: 800px;
                  }
                }

                .item-image {
                  width: 40px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: 4px;
                  transition: transform 0.2s;
                }

                .item-image:hover {
                  transform: scale(3);
                  z-index: 1000;
                }

                .table > :not(caption) > * > * {
                  padding: 0.75rem;
                  vertical-align: middle;
                }

                .badge-currency {
                  background-color: #e3f2fd;
                  color: #1976d2;
                }

                .badge-asset {
                  background-color: #f3e5f5;
                  color: #7b1fa2;
                }

                .table-hover tbody tr:hover {
                  background-color: rgba(0, 0, 0, 0.02);
                }

                .mint-address {
                  font-family: monospace;
                  font-size: 0.875em;
                  background-color: #f8f9fa;
                  padding: 0.2em 0.4em;
                  border-radius: 3px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 150px;
                  display: inline-block;
                }
              `}
            </style>
            <div className="mobile-table-wrapper">
              <table className="table table-hover mb-0">
                <thead>
                  <tr className="bg-light">
                    <th style={{ width: '90px' }}>Loại</th>
                    <th style={{ width: '80px' }}>Ảnh</th>
                    <th style={{ width: '180px' }}>Tên</th>
                    <th style={{ width: '200px' }}>Mô tả</th>
                    <th style={{ width: '100px' }}>Bộ sưu tập</th>
                    <th style={{ width: '300px' }}>Địa chỉ ví</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((itemData, index) => {
                    const { type, item } = itemData;
                    return (
                      <tr key={index}>
                        <td>
                          <span className={`badge ${type === 'Currency' ? 'badge-currency' : 'badge-asset'}`}>
                            {type}
                          </span>
                        </td>
                        <td>
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="item-image"
                              title={item.name}
                            />
                          ) : (
                            <div 
                              className="bg-light d-flex align-items-center justify-content-center" 
                              style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                            >
                              <i className="fas fa-image text-muted"></i>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="fw-medium">{item.name || item.symbol || '-'}</div>
                          <small className="text-muted">ID: {truncateText(item.id, 15)}</small>
                        </td>
                        <td>
                          {type === 'Currency' ? (
                            <div>
                              <span className="badge bg-light text-dark">
                                Decimals: {item.decimals}
                              </span>
                            </div>
                          ) : (
                            <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.description}>
                              {item.description || '-'}
                            </div>
                          )}
                        </td>
                        <td>
                          {type === 'UniqueAsset' && item.collection ? (
                            <div>
                              <div className="fw-medium">{truncateText(item.collection.name, 40)}</div>
                              <small className="text-muted">
                                {item.collection.environment}
                              </small>
                            </div>
                          ) : '-'}
                        </td>
                        <td>
                          <span className="mint-address" title={item.mintAddress}>
                            {item.mintAddress}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsTable;