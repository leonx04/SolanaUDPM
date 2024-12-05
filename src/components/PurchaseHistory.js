import React, { useCallback, useEffect, useReducer } from 'react';
import { Button, Form, InputGroup, Modal, Pagination, Spinner, Table } from 'react-bootstrap';
import { apiKey } from '../api';
import '../App.css';
import axios from 'axios';

// Action types for reducer
const ACTIONS = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  SET_FILTERED_PURCHASES: 'SET_FILTERED_PURCHASES',
  SET_SELECTED_PURCHASE: 'SET_SELECTED_PURCHASE',
  CLEAR_SELECTED_PURCHASE: 'CLEAR_SELECTED_PURCHASE',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_STATUS_FILTER: 'SET_STATUS_FILTER',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_ITEMS_PER_PAGE: 'SET_ITEMS_PER_PAGE',
  SET_IMAGE_TO_SHOW: 'SET_IMAGE_TO_SHOW',
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.FETCH_START:
      return { ...state, loading: true, error: null };
    case ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, purchases: action.payload, lastFetchTime: Date.now() };
    case ACTIONS.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload };
    case ACTIONS.SET_FILTERED_PURCHASES:
      return { ...state, filteredPurchases: action.payload };
    case ACTIONS.SET_SELECTED_PURCHASE:
      return { ...state, selectedPurchase: action.payload };
    case ACTIONS.CLEAR_SELECTED_PURCHASE:
      return { ...state, selectedPurchase: null };
    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload };
    case ACTIONS.SET_STATUS_FILTER:
      return { ...state, statusFilter: action.payload };
    case ACTIONS.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };
    case ACTIONS.SET_ITEMS_PER_PAGE:
      return { ...state, itemsPerPage: action.payload };
    case ACTIONS.SET_IMAGE_TO_SHOW:
      return { ...state, imageToShow: action.payload };
    default:
      return state;
  }
};

const PurchaseHistory = ({ referenceId }) => {
  const [state, dispatch] = useReducer(reducer, {
    purchases: [],
    filteredPurchases: [],
    loading: true,
    error: null,
    selectedPurchase: null,
    searchTerm: '',
    statusFilter: 'Tất cả',
    currentPage: 1,
    itemsPerPage: 5,
    imageToShow: null,
    lastFetchTime: Date.now(),
  });

  const fetchPurchaseHistory = useCallback(async (signal) => {
    dispatch({ type: ACTIONS.FETCH_START });

    try {
      const response = await axios.get('https://api.gameshift.dev/nx/payments', {
        signal,
        headers: {
          accept: 'application/json',
          'x-api-key': apiKey,
        },
      });

      if (Array.isArray(response.data.data)) {
        const userPurchases = response.data.data.filter(
          (purchase) => purchase.purchaser.referenceId === referenceId
        );

        dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: userPurchases });
        applyFiltersAndSearch(userPurchases);
      } else {
        throw new Error("Dữ liệu trả về không đúng định dạng.");
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: 'Không thể tải lịch sử mua hàng: ' + err.message });
        console.error('Fetch error:', err);
      }
    }
  }, [referenceId]);

  const applyFiltersAndSearch = useCallback((purchases) => {
    let result = purchases;

    if (state.statusFilter !== 'Tất cả') {
      result = result.filter(purchase => purchase.status === state.statusFilter);
    }

    if (state.searchTerm) {
      result = result.filter(purchase =>
        purchase.sku.item.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        purchase.sku.item.description.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
    }

    dispatch({ type: ACTIONS.SET_FILTERED_PURCHASES, payload: result });
    dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: 1 });
  }, [state.statusFilter, state.searchTerm]);

  useEffect(() => {
    if (referenceId) {
      const controller = new AbortController();
      fetchPurchaseHistory(controller.signal);
      return () => controller.abort();
    }
  }, [referenceId, fetchPurchaseHistory]);

  useEffect(() => {
    applyFiltersAndSearch(state.purchases);
  }, [state.purchases, state.statusFilter, state.searchTerm, applyFiltersAndSearch]);

  const handleViewDetails = (purchase) => {
    dispatch({ type: ACTIONS.SET_SELECTED_PURCHASE, payload: purchase });
  };

  const handleCloseModal = () => {
    dispatch({ type: ACTIONS.CLEAR_SELECTED_PURCHASE });
  };

  const handleImageClick = (imageUrl) => {
    dispatch({ type: ACTIONS.SET_IMAGE_TO_SHOW, payload: imageUrl });
  };

  const indexOfLastItem = state.currentPage * state.itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - state.itemsPerPage;
  const currentItems = state.filteredPurchases.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: pageNumber });

  const totalPages = Math.ceil(state.filteredPurchases.length / state.itemsPerPage);

  const renderPaginationItems = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <Pagination.First key="first" onClick={() => paginate(1)} />,
        <Pagination.Ellipsis key="ellipsis-start" />
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Pagination.Item
          key={i}
          active={i === state.currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      pageNumbers.push(
        <Pagination.Ellipsis key="ellipsis-end" />,
        <Pagination.Last key="last" onClick={() => paginate(totalPages)} />
      );
    }

    return pageNumbers;
  };

  if (state.loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (state.error) {
    return <div className="alert alert-danger">{state.error}</div>;
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      <div className="card-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h5 style={{ margin: 0 }}>Lịch Sử Mua Hàng</h5>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: 1, minWidth: '250px' }}>
            <InputGroup style={{ flex: 1, minWidth: '200px' }}>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm theo tên hoặc mô tả..."
                value={state.searchTerm}
                onChange={(e) => dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: e.target.value })}
                style={{ height: '38px' }}
              />
            </InputGroup>

            <Form.Select
              value={state.statusFilter}
              onChange={(e) => dispatch({ type: ACTIONS.SET_STATUS_FILTER, payload: e.target.value })}
              style={{ width: '150px', height: '38px', minWidth: '120px' }}
            >
              <option value="Tất cả">Tất cả</option>
              <option value="Confirmed">Đã xác nhận</option>
              <option value="Pending">Đang chờ</option>
              <option value="Expired">Hết hạn</option>
              <option value="Completed">Hoàn thành</option>
            </Form.Select>

            <Form.Select
              value={state.itemsPerPage}
              onChange={(e) => dispatch({ type: ACTIONS.SET_ITEMS_PER_PAGE, payload: Number(e.target.value) })}
              style={{ width: '100px', height: '38px', minWidth: '80px' }}
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </Form.Select>
            <Button
              className="btn btn-primary btn-sm"
              onClick={() => fetchPurchaseHistory()}
              style={{ height: '38px', display: 'flex', alignItems: 'center' }}
            >
              <i className="bi bi-arrow-clockwise"></i>
            </Button>
          </div>
        </div>
      </div>

      <div className="card-body" style={{ padding: '15px', overflowX: 'auto', width: '100%' }}>
        <Table responsive hover style={{ minWidth: '800px', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '10%' }}>Ảnh</th>
              <th style={{ width: '15%' }}>Sản phẩm</th>
              <th style={{ width: '20%' }}>Mô tả</th>
              <th style={{ width: '10%' }}>Giá</th>
              <th style={{ width: '10%' }}>Ngày tạo</th>
              <th style={{ width: '10%' }}>Trạng thái</th>
              <th style={{ width: '10%' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((purchase, index) => (
              <tr key={purchase.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td>
                  <img
                    src={purchase.sku.item.imageUrl}
                    alt={purchase.sku.item.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      cursor: "pointer",
                      borderRadius: '4px'
                    }}
                    onClick={() => handleImageClick(purchase.sku.item.imageUrl)}
                  />
                </td>
                <td>{purchase.sku.item.name}</td>
                <td>{purchase.sku.item.description}</td>
                <td>{purchase.price.naturalAmount} USDC</td>
                <td>
                  {new Date(purchase.sku.item.created).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'UTC'
                  })}
                </td>
                <td>
                  <span
                    className={`badge ${purchase.status === "Confirmed"
                      ? "bg-success"
                      : purchase.status === "Pending"
                        ? "bg-warning"
                        : purchase.status === "Expired"
                          ? "bg-danger"
                          : "bg-secondary"
                      }`}
                    style={{ fontSize: '0.8em' }}
                  >
                    {purchase.status}
                  </span>
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewDetails(purchase)}
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {state.filteredPurchases.length === 0 && (
          <div className="text-center text-muted" style={{ padding: '20px' }}>
            Không có giao dịch nào phù hợp
          </div>
        )}

        {state.filteredPurchases.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
            <div className="text-muted" style={{ minWidth: '200px' }}>
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, state.filteredPurchases.length)}
              {' '}trong tổng số{' '}
              {state.filteredPurchases.length} giao dịch
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Pagination style={{ margin: 0 }}>
                {renderPaginationItems()}
              </Pagination>
            </div>
          </div>
        )}
      </div>

      {state.selectedPurchase && (
        <Modal show={!!state.selectedPurchase} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Chi tiết đơn hàng</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center">
              <img
                src={state.selectedPurchase.sku.item.imageUrl}
                alt={state.selectedPurchase.sku.item.name}
                style={{
                  width: "400px",
                  height: "400px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "15px",
                }}
              />
            </div>
            <p><strong>Sản phẩm:</strong> {state.selectedPurchase.sku.item.name}</p>
            <p><strong>Mô tả:</strong> {state.selectedPurchase.sku.item.description}</p>
            <p><strong>Giá:</strong> {state.selectedPurchase.price.naturalAmount} USDC</p>
            <p>
              <strong>Ngày mua:</strong>{" "}
              {new Date(state.selectedPurchase.sku.item.created).toLocaleDateString()}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              <span
                className={`badge ${state.selectedPurchase.status === "Confirmed"
                  ? "bg-success"
                  : state.selectedPurchase.status === "Pending"
                    ? "bg-warning"
                    : state.selectedPurchase.status === "Expired"
                      ? "bg-danger"
                      : "bg-secondary"
                  }`}
              >
                {state.selectedPurchase.status}
              </span>
            </p>
            {state.selectedPurchase.status === "Pending" && (
              <p>
                <strong>Tiếp tục thanh toán:</strong>{" "}
                <a
                  href={`https://app.gameshift.dev/checkout?payment=${state.selectedPurchase.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning btn-sm"
                >
                  Thanh toán
                </a>
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Đóng
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {state.imageToShow && (
        <Modal show={true} onHide={() => dispatch({ type: ACTIONS.SET_IMAGE_TO_SHOW, payload: null })} centered>
          <Modal.Body>
            <div className="image-zoom-container">
              <img
                src={state.imageToShow}
                alt="Phóng to"
                className="zoomed-image"
                onClick={() => dispatch({ type: ACTIONS.SET_IMAGE_TO_SHOW, payload: null })}
              />
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default PurchaseHistory;

