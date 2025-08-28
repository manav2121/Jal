// frontend/src/App.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Axios instance + token
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// helpers
const normalizePhone = (s) => String(s || "").trim();
const isPhoneLikelyValid = (s) => {
  const digits = String(s).replace(/\D/g, "");
  return digits.length >= 10; // simple client-side check
};

function App() {
  // views: 'otp' | 'products' | 'cart' | 'orders' | 'admin'
  const [view, setView] = useState("otp");

  // OTP auth state
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState({
    phone: "",
    code: "",
    name: "",
    remember: true,
    step: "request", // 'request' | 'verify'
    loading: false,
    error: "",
    devCode: ""
  });

  // data
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const setAuthField = (k, v) => setAuth((p) => ({ ...p, [k]: v }));
  const toggleRemember = () => setAuthField("remember", !auth.remember);

  const persistUser = (data) => {
    const payload = JSON.stringify(data);
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    if (auth.remember) localStorage.setItem("user", payload);
    else sessionStorage.setItem("user", payload);
  };

  // ---------- OTP AUTH ----------
  const requestOtp = async () => {
    setAuthField("error", "");
    const phone = normalizePhone(auth.phone);
    if (!isPhoneLikelyValid(phone)) {
      return setAuthField("error", "Enter a valid mobile number");
    }
    setAuthField("loading", true);
    try {
      const { data } = await api.post("/auth/otp/request", { phone });
      setAuth((p) => ({
        ...p,
        step: "verify",
        loading: false,
        devCode: data.devCode || ""
      }));
      if (data.devCode) {
        // For development you can show the OTP, remove in production
        console.log("DEV OTP:", data.devCode);
      }
    } catch (e) {
      setAuth({
        ...auth,
        loading: false,
        error: e?.response?.data?.message || "Failed to send OTP"
      });
    }
  };

  const verifyOtp = async () => {
    setAuthField("error", "");
    const phone = normalizePhone(auth.phone);
    const code = String(auth.code || "").trim();
    if (!code) return setAuthField("error", "Enter the OTP");

    setAuthField("loading", true);
    try {
      const { data } = await api.post("/auth/otp/verify", {
        phone,
        code,
        name: auth.name // used if user is created the first time
      });
      persistUser(data);
      setUser(data);
      setView("products");
      setAuth((p) => ({ ...p, loading: false }));
    } catch (e) {
      setAuth({
        ...auth,
        loading: false,
        error: e?.response?.data?.message || "OTP verification failed"
      });
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setUser(null);
    setView("otp");
    setAuth({
      phone: "",
      code: "",
      name: "",
      remember: true,
      step: "request",
      loading: false,
      error: "",
      devCode: ""
    });
  };

  // ---------- PRODUCTS ----------
  const fetchProducts = async () => {
    const { data } = await api.get("/products");
    setProducts(data.map((p) => ({ ...p, qty: 1 })));
  };
  const changeQty = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p))
    );
  };

  // ---------- CART ----------
  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i._id === product._id);
      if (exists) {
        return prev.map((i) =>
          i._id === product._id ? { ...i, qty: i.qty + product.qty } : i
        );
      }
      return [...prev, { ...product }];
    });
  };
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i._id !== id));
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const placeOrder = async () => {
    if (!user) return alert("Please login first");
    if (cart.length === 0) return alert("Cart is empty");
    const items = cart.map((i) => ({
      productId: i._id,
      name: i.name,
      price: i.price,
      quantity: i.qty
    }));
    const totalPrice = items.reduce((s, it) => s + it.price * it.quantity, 0);
    try {
      await api.post("/orders", { items, totalPrice });
      setCart([]);
      alert("✅ Order placed!");
      setView("orders");
      fetchMyOrders();
    } catch (e) {
      alert(e?.response?.data?.message || "Order failed");
    }
  };

  // ---------- ORDERS ----------
  const fetchMyOrders = async () => {
    const { data } = await api.get("/orders/my-orders");
    setMyOrders(data);
  };

  // ---------- ADMIN ----------
  const fetchAdminPanel = async () => {
    const [ordersRes, usersRes] = await Promise.all([api.get("/orders"), api.get("/auth/users")]);
    setAllOrders(ordersRes.data);
    setAllUsers(usersRes.data);
  };

  // ---------- BOOT ----------
  useEffect(() => {
    const s = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (s) {
      const u = JSON.parse(s);
      setUser(u);
      setView("products");
    } else {
      setView("otp");
    }
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  return (
    <div className="App">
      <header>
        <h1>💧 Water Jar Store</h1>

        {user && (
          <div>
            Welcome, <strong>{user.name}</strong> ({user.role})
            <button onClick={() => setView("products")}>Products</button>
            <button onClick={() => setView("cart")}>Cart ({cart.length})</button>
            <button onClick={() => { setView("orders"); fetchMyOrders(); }}>
              My Orders
            </button>
            {user.role === "admin" && (
              <button onClick={() => { setView("admin"); fetchAdminPanel(); }}>
                Admin Panel
              </button>
            )}
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {/* OTP AUTH UI */}
      {!user && view === "otp" && (
        <div className="auth-form">
          <h2>Sign in with Mobile OTP</h2>

          {auth.error ? <p className="err">{auth.error}</p> : null}

          {/* Step 1: Phone */}
          {auth.step === "request" && (
            <>
              <label>Mobile number</label>
              <input
                name="phone"
                placeholder="e.g., 9876543210 or +919876543210"
                value={auth.phone}
                onChange={(e) => setAuthField("phone", e.target.value)}
                autoComplete="tel"
              />
              <label className="remember">
                <input
                  type="checkbox"
                  checked={auth.remember}
                  onChange={toggleRemember}
                />
                Keep me signed in
              </label>
              <button onClick={requestOtp} disabled={auth.loading}>
                {auth.loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </>
          )}

          {/* Step 2: OTP verify + optional name for first-time users */}
          {auth.step === "verify" && (
            <>
              <label>Enter OTP</label>
              <input
                name="code"
                placeholder="6-digit code"
                value={auth.code}
                onChange={(e) => setAuthField("code", e.target.value)}
                inputMode="numeric"
              />

              <label>Your name (optional if returning)</label>
              <input
                name="name"
                placeholder="Your name"
                value={auth.name}
                onChange={(e) => setAuthField("name", e.target.value)}
                autoComplete="name"
              />

              {auth.devCode ? (
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  DEV OTP: <code>{auth.devCode}</code> (visible only on dev/debug)
                </p>
              ) : null}

              <button onClick={verifyOtp} disabled={auth.loading}>
                {auth.loading ? "Verifying..." : "Verify & Continue"}
              </button>
              <button
                type="button"
                onClick={() => setAuth({ ...auth, step: "request", code: "", error: "" })}
                disabled={auth.loading}
              >
                Change number
              </button>
            </>
          )}
        </div>
      )}

      {/* PRODUCTS */}
      {user && view === "products" && (
        <div className="product-list">
          {products.map((p) => (
            <div className="product-card" key={p._id}>
              <h3>{p.name}</h3>
              <p>₹{p.price}</p>
              <div className="qty-row">
                <button onClick={() => changeQty(p._id, -1)} disabled={p.qty <= 1}>-</button>
                <span>{p.qty}</span>
                <button onClick={() => changeQty(p._id, 1)}>+</button>
              </div>
              <button onClick={() => addToCart(p)}>Add to cart</button>
            </div>
          ))}
        </div>
      )}

      {/* CART */}
      {user && view === "cart" && (
        <div>
          <h2>Cart</h2>
          {cart.length === 0 ? (
            <p>Cart is empty</p>
          ) : (
            <>
              {cart.map((i) => (
                <div className="cart-item" key={i._id}>
                  <div>{i.name} x {i.qty}</div>
                  <div>₹{i.price * i.qty}</div>
                  <button onClick={() => removeFromCart(i._id)}>Remove</button>
                </div>
              ))}
              <h3>Total: ₹{cartTotal}</h3>
              <button className="place-order" onClick={placeOrder}>Place Order</button>
            </>
          )}
        </div>
      )}

      {/* MY ORDERS */}
      {user && view === "orders" && (
        <div>
          <h2>My Orders</h2>
          {myOrders.length === 0 ? (
            <p>No orders yet</p>
          ) : (
            myOrders.map((o) => (
              <div key={o._id} className="order-card">
                <strong>Order #{o._id}</strong> — ₹{o.totalPrice} — {new Date(o.createdAt).toLocaleString()}
                <ul>
                  {o.items.map((it, idx) => (
                    <li key={idx}>{it.name} x {it.quantity} = ₹{it.price * it.quantity}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      {/* ADMIN */}
      {user && view === "admin" && (
        <div className="admin-panel">
          <h2>Admin — All Orders</h2>
          {allOrders.map((o) => (
            <div key={o._id} className="order-card">
              <strong>Order #{o._id}</strong> — ₹{o.totalPrice} — {new Date(o.createdAt).toLocaleString()} — User: {o.user?.name || "Unknown"}
              <ul>
                {o.items.map((it, idx) => (
                  <li key={idx}>{it.name} x {it.quantity} = ₹{it.price * it.quantity}</li>
                ))}
              </ul>
            </div>
          ))}
          <h2>All Users</h2>
          {allUsers.map((u) => (
            <div key={u._id} className="user-card">
              {u.name} — {u.phone || u.email || "no phone"} — {u.role}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
