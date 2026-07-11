import { useEffect, useState } from 'react';
import { productApi, redemptionApi } from '../api/client';
import { useAuth } from '../store/AuthContext';
import type { Product } from '../types';

export default function ShopPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    productApi.list().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (productId: string) => {
    if (!user) return;
    setMessage('');
    try {
      await redemptionApi.create({ productId, quantity: 1 });
      setMessage('兑换请求已提交！');
      // Refresh user coins
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '兑换失败');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div className="shop-page">
      <h1>商城</h1>
      {user && <p className="user-coins">当前竞猜币：🪙 {user.coins}</p>}
      {message && <div className="toast">{message}</div>}

      <div className="product-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            {product.imageUrl && (
              <div className="product-image">
                <img src={product.imageUrl} alt={product.name} />
              </div>
            )}
            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-meta">
                <span className="product-price">🪙 {product.price}</span>
                <span className="product-stock">库存：{product.stock}</span>
              </div>
              <button
                className="btn-primary"
                disabled={!user || product.stock < 1}
                onClick={() => handleRedeem(product.id)}
              >
                {!user ? '登录后兑换' : product.stock < 1 ? '已售罄' : '兑换'}
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="empty-state">暂无商品</div>}
      </div>
    </div>
  );
}
