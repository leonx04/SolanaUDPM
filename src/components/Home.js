import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Alert, Button, Card, Carousel, Form, InputGroup, Modal, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiKey } from '../api';

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSide = Math.floor((maxPagesToShow - 3) / 2);

    if (currentPage <= maxPagesToShow - 2) {
      return [
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) => i + 1),
        '...',
        totalPages
      ];
    }

    if (currentPage > totalPages - (maxPagesToShow - 2)) {
      return [
        1,
        '...',
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) =>
          totalPages - (maxPagesToShow - 2) + i
        )
      ];
    }

    return [
      1,
      '...',
      ...Array.from({ length: maxPagesToShow - 2 }, (_, i) =>
        currentPage - leftSide + i
      ),
      '...',
      totalPages
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav>
      <ul className="pagination mb-0 justify-content-center">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &#10094; Trước
          </Button>
        </li>

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <li key={`ellipsis-${index}`} className="page-item">
                <span className="page-link text-muted">...</span>
              </li>
            );
          }

          return (
            <li
              key={page}
              className={`page-item ${currentPage === page ? 'active' : ''}`}
            >
              <Button
                variant={currentPage === page ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="mx-1"
              >
                {page}
              </Button>
            </li>
          );
        })}

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Tiếp &#10095;
          </Button>
        </li>
      </ul>
    </nav>
  );
};
// Action types for reducer
const ACTIONS = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  UPDATE_FILTERS: 'UPDATE_FILTERS',
  SET_SELECTED_ITEM: 'SET_SELECTED_ITEM',
  CLEAR_SELECTED_ITEM: 'CLEAR_SELECTED_ITEM',
  SET_BUY_LOADING: 'SET_BUY_LOADING',
  SET_BUY_ERROR: 'SET_BUY_ERROR',
  SET_ACTIVE_COLLECTION: 'SET_ACTIVE_COLLECTION',
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.FETCH_START:
      return { ...state, loading: true, error: null };
    case ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, allItems: action.payload, lastFetchTime: Date.now() };
    case ACTIONS.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload };
    case ACTIONS.UPDATE_FILTERS:
      return { ...state, ...action.payload };
    case ACTIONS.SET_SELECTED_ITEM:
      return { ...state, selectedItem: action.payload };
    case ACTIONS.CLEAR_SELECTED_ITEM:
      return { ...state, selectedItem: null };
    case ACTIONS.SET_BUY_LOADING:
      return { ...state, buyLoading: action.payload };
    case ACTIONS.SET_BUY_ERROR:
      return { ...state, buyError: action.payload };
    case ACTIONS.SET_ACTIVE_COLLECTION:
      return { ...state, activeCollection: action.payload };
    default:
      return state;
  }
};

const COLLECTION_IDS = {
  art: '35fe7ca2-e2ce-4df5-b24c-5040c6f0d186',
  images: 'fba8b4c9-5a04-466c-b609-6532cbd6d9d1',
};

const MarketplaceHome = ({ referenceId }) => {
  const [state, dispatch] = useReducer(reducer, {
    allItems: [],
    loading: true,
    error: null,
    selectedItem: null,
    buyLoading: false,
    buyError: null,
    lastFetchTime: Date.now(),
    sortOrder: 'default',
    priceRange: { min: '', max: '' },
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 6,
    activeCollection: COLLECTION_IDS.art,
  });

  const productSectionRef = useRef(null);
  const allProductsSectionRef = useRef(null);

  const filteredItems = useMemo(() => {
    return state.allItems.filter(itemData =>
      itemData.type === 'UniqueAsset' &&
      itemData.item.price &&
      itemData.item.price.naturalAmount !== null &&
      parseFloat(itemData.item.price.naturalAmount) > 0 &&
      itemData.item.owner.referenceId !== referenceId &&
      itemData.item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) &&
      (state.priceRange.min === '' || parseFloat(itemData.item.price.naturalAmount) >= state.priceRange.min) &&
      (state.priceRange.max === '' || parseFloat(itemData.item.price.naturalAmount) <= state.priceRange.max)
    ).sort((a, b) => {
      if (state.sortOrder === 'highToLow') {
        return parseFloat(b.item.price.naturalAmount) - parseFloat(a.item.price.naturalAmount);
      } else if (state.sortOrder === 'lowToHigh') {
        return parseFloat(a.item.price.naturalAmount) - parseFloat(b.item.price.naturalAmount);
      }
      return 0;
    });
  }, [state.allItems, referenceId, state.searchQuery, state.priceRange, state.sortOrder]);

  const featuredItems = useMemo(() => {
    const sortedItems = state.allItems
      .filter(itemData => 
        itemData.item.price &&
        parseFloat(itemData.item.price.naturalAmount) > 0 && 
        itemData.item.owner.referenceId !== referenceId 
      )
      .sort((a, b) => {
        const priceDiff = parseFloat(a.item.price.naturalAmount) - parseFloat(b.item.price.naturalAmount);
        if (priceDiff !== 0) return priceDiff;
        return new Date(b.item.createdAt) - new Date(a.item.createdAt);
      });
    return sortedItems.slice(0, 3);
  }, [state.allItems, referenceId]);

  const paginatedItems = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, state.currentPage, state.itemsPerPage]);

  const fetchAllItems = useCallback(async (signal) => {
    dispatch({ type: ACTIONS.FETCH_START });

    try {
      const fetchPage = async (page) => {
        const response = await axios.get('https://api.gameshift.dev/nx/items', {
          signal,
          params: {
            perPage: 100,
            page: page,
            collectionId: state.activeCollection,
          },
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
          },
        });
        return response.data;
      };

      let allFetchedItems = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { data, meta } = await fetchPage(page);
        allFetchedItems.push(...data);
        totalPages = meta.totalPages;
        page++;
      }

      dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: allFetchedItems });
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: 'Không thể tải danh sách sản phẩm: ' + err.message });
        console.error('Fetch error:', err);
      }
    }
  }, [state.activeCollection]);

  const handlePeriodicRefresh = useCallback(async () => {
    const controller = new AbortController();
    await fetchAllItems(controller.signal);
    return () => controller.abort();
  }, [fetchAllItems]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      handlePeriodicRefresh();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [handlePeriodicRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllItems(controller.signal);
    return () => controller.abort();
  }, [fetchAllItems]);

  const handleManualRefresh = async () => {
    await fetchAllItems();
    dispatch({ 
      type: ACTIONS.UPDATE_FILTERS, 
      payload: { 
        searchQuery: '', 
        sortOrder: 'default', 
        priceRange: { min: '', max: '' }, 
        currentPage: 1 
      } 
    });
  };

  const handleBuyItem = (itemData) => {
    dispatch({ type: ACTIONS.SET_SELECTED_ITEM, payload: itemData.item });
    dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: null });
  };

  const buyItemWithPhantomWallet = async () => {
    dispatch({ type: ACTIONS.SET_BUY_LOADING, payload: true });
    dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: null });

    try {
      const provider = window.phantom?.solana;
      if (!provider || !provider.isConnected) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
      }

      const response = await axios.post(
        `https://api.gameshift.dev/nx/unique-assets/${state.selectedItem.id}/buy`,
        {
          buyerId: referenceId
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': apiKey
          }
        }
      );

      const { consentUrl } = response.data;
      window.open(consentUrl, '_blank');
      fetchAllItems();
    } catch (err) {
      console.error('Lỗi mua sản phẩm:', err);

      const errorMessage = err.response?.data?.message ||
        err.message ||
        'Không thể thực hiện giao dịch. Vui lòng thử lại.';

      dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: errorMessage });
    } finally {
      dispatch({ type: ACTIONS.SET_BUY_LOADING, payload: false });
    }
  };

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAllProducts = () => {
    allProductsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderProductGrid = (items) => {
    if (state.loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-inbox-fill text-muted" style={{ fontSize: '4rem' }}></i>
          <h2 className="text-muted mt-3">Không có sản phẩm nào</h2>
          <p className="text-muted">Hiện tại chưa có sản phẩm nào để hiển thị.</p>
          <Button
            variant="outline-primary"
            onClick={handleManualRefresh}
            className="mt-3"
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Tải lại
          </Button>
        </div>
      );
    }

    return (
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 mb-4">
        {items.map((itemData) => {
          const item = itemData.item;
          return (
            <div key={item.id} className="col">
              <Card className="h-100 shadow-sm hover-lift">
                <Card.Img
                  variant="top"
                  src={item.imageUrl || '/default-image.jpg'}
                  alt={item.name}
                  className="card-img-top object-fit-cover"
                  style={{ height: '200px' }}
                />
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="fw-bold mb-2">{item.name}</Card.Title>
                  <Card.Text className="text-muted small mb-3">
                    Tác giả: <Link className="text-decoration-none badge badge-success" to={`/account/${item.owner.referenceId}`}> {item.owner.referenceId}</Link>
                  </Card.Text>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary rounded-pill px-3 py-2">
                      {`$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}`}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleBuyItem(itemData)}
                      className="rounded-pill"
                    >
                      Xem
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="marketplace-home">
      <header className="hero-section text-center py-5 mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Khám phá NFT độc đáo</h1>
        <p className="lead mb-4">Sở hữu những tác phẩm nghệ thuật số độc nhất và tiên phong trong thế giới metaverse.</p>
        <Button variant="primary" size="lg" className="rounded-pill px-4 py-2" onClick={scrollToProducts}>Khám phá ngay</Button>
      </header>

      <div className="carousel container mb-5 ">
        <Carousel className="rounded-lg overflow-hidden shadow-lg">
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://static.vecteezy.com/system/resources/previews/017/797/790/non_2x/banner-for-nft-industry-one-point-perspective-concept-with-terms-of-web3-vector.jpg"
              alt="Bộ sưu tập NFT"
            />
            <Carousel.Caption>
              <h3>Bộ sưu tập NFT độc quyền</h3>
              <p>Khám phá những tác phẩm nghệ thuật số độc đáo nhất.</p>
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://static.vecteezy.com/system/resources/previews/023/325/782/non_2x/futuristic-digital-technology-metaverse-nft-virtual-reality-concept-young-girl-wearing-vr-virtual-reality-goggle-experiencing-virtual-world-glitch-effect-vector.jpg"
              alt="Trải nghiệm Metaverse"
            />
            <Carousel.Caption>
              <h3>Trải nghiệm Metaverse</h3>
              <p>Bước vào thế giới ảo với NFT của bạn.</p>
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </div>

      <div className="container mb-5" ref={productSectionRef}>
        <h2 className="text-center fw-bold mb-4">Sản phẩm nổi bật</h2>
        {renderProductGrid(featuredItems)}
        <div className="text-center mt-4">
          <Button variant="outline-primary" onClick={scrollToAllProducts}>Xem tất cả sản phẩm</Button>
        </div>
      </div>

      <section className="roadmap-section py-5 bg-light">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">Lộ trình phát triển</h2>
          <div className="row g-4">
            {[
              { title: "Giai đoạn 1", description: "Phát triển cơ sở hạ tầng và tích hợp Blockchain." },
              { title: "Giai đoạn 2", description: "Ra mắt bộ sưu tập NFT đầu tiên và hợp tác đối tác." },
              { title: "Giai đoạn 3", description: "Mở rộng cộng đồng và triển khai tính năng mới." },
              { title: "Giai đoạn 4", description: "Tích hợp Metaverse và trải nghiệm thực tế ảo." }
            ].map((stage, index) => (
              <div key={index} className="col-md-3">
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body>
                    <div className="display-4 mb-3 text-primary">{index + 1}</div>
                    <h5 className="card-title fw-bold">{stage.title}</h5>
                    <p className="card-text">{stage.description}</p>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mt-5" ref={allProductsSectionRef}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Tất cả sản phẩm</h2>
          <div className="d-flex align-items-center">
            <small className="text-muted me-3">
              Cập nhật lần cuối: {new Date(state.lastFetchTime).toLocaleString()}
            </small>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleManualRefresh}
              className="rounded-circle"
              disabled={state.loading}
            >
              <i className={`bi ${state.loading ? 'bi-hourglass-split' : 'bi-arrow-clockwise'}`}></i>
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Button
            variant={state.activeCollection === COLLECTION_IDS.art ? "primary" : "outline-primary"}
            className="me-2"
            onClick={() => dispatch({ type: ACTIONS.SET_ACTIVE_COLLECTION, payload: COLLECTION_IDS.art })}
          >
            Bộ sưu tập nghệ thuật
          </Button>
          <Button
            variant={state.activeCollection === COLLECTION_IDS.images ? "primary" : "outline-primary"}
            onClick={() => dispatch({ type: ACTIONS.SET_ACTIVE_COLLECTION, payload: COLLECTION_IDS.images })}
          >
            Bộ sưu tập hình ảnh
          </Button>
        </div>

        <Form className="mb-4">
          <div className="row g-3">
            <div className="col-md-4">
              <InputGroup>
                <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={state.searchQuery}
                  onChange={(e) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { searchQuery: e.target.value } })}
                />
              </InputGroup>
            </div>
            <div className="col-md-3">
              <Form.Select
                value={state.sortOrder}
                onChange={(e) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { sortOrder: e.target.value } })}
              >
                <option value="default">Sắp xếp mặc định</option>
                <option value="lowToHigh">Giá: Thấp đến Cao</option>
                <option value="highToLow">Giá: Cao đến Thấp</option>
              </Form.Select>
            </div>
            <div className="col-md-5">
              <InputGroup>
                <InputGroup.Text>Khoảng giá</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Từ"
                  value={state.priceRange.min}
                  onChange={(e) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { priceRange: { ...state.priceRange, min: e.target.value } } })}
                />
                <InputGroup.Text>-</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Đến"
                  value={state.priceRange.max}
                  onChange={(e) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { priceRange: { ...state.priceRange, max: e.target.value } } })}
                />
              </InputGroup>
            </div>
          </div>
        </Form>

        {renderProductGrid(paginatedItems)}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            Hiển thị: {paginatedItems.length} / {filteredItems.length} sản phẩm
          </div>
          <Pagination
            currentPage={state.currentPage}
            totalPages={Math.ceil(filteredItems.length / state.itemsPerPage)}
            onPageChange={(page) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { currentPage: page } })}
          />
          <Form.Select
            size="sm"
            value={state.itemsPerPage}
            onChange={(e) => dispatch({ type: ACTIONS.UPDATE_FILTERS, payload: { itemsPerPage: Number(e.target.value) } })}
            className="w-auto"
          >
            {[6, 12, 24, 50].map((num) => (
              <option key={num} value={num}>
                {num} sản phẩm/trang
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      {state.selectedItem && (
        <Modal show={!!state.selectedItem} onHide={() => dispatch({ type: ACTIONS.CLEAR_SELECTED_ITEM })} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Xem chi tiết <span className="badge bg-info">{state.selectedItem.name}</span></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <img
                  src={state.selectedItem.imageUrl}
                  alt={state.selectedItem.name}
                  className="img-fluid rounded shadow-sm mb-3"
                />
              </div>
              <div className="col-md-6">
                <h5 className="mb-3">Chi tiết sản phẩm</h5>
                <Card className="mb-3">
                  <Card.Body>
                    <p><strong>Tên:</strong> {state.selectedItem.name}</p>
                    <p><strong>Mô tả:</strong> {state.selectedItem.description || 'Không có mô tả'}</p>
                    <p><strong>Giá:</strong> ${parseFloat(state.selectedItem.price.naturalAmount).toFixed(2)} {state.selectedItem.price.currencyId}</p>
                  </Card.Body>
                </Card>

                {state.selectedItem.attributes && state.selectedItem.attributes.length > 0 && (
                  <Card>
                    <Card.Header>Thuộc tính</Card.Header>
                    <Card.Body>
                      {state.selectedItem.attributes.map((attr, index) => (
                        <div key={index} className="d-flex justify-content-between mb-2">
                          <span className="text-muted">{attr.traitType}</span>
                          <span className="badge bg-secondary">{attr.value}</span>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                )}

                {state.buyError && (
                  <Alert variant="danger" className="mt-3">
                    {state.buyError}
                  </Alert>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => dispatch({ type: ACTIONS.CLEAR_SELECTED_ITEM })}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={buyItemWithPhantomWallet}
              disabled={state.buyLoading}
            >
              {state.buyLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận mua'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default MarketplaceHome;
