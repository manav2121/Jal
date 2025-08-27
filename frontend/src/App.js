// frontend/src/App.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// Backend API base:
// - In dev it uses localhost:5000
// - In production set REACT_APP_API_URL on your Static Site in Render
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Create an axios instance and auto-attach token from localStorage
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("user");
  if (stored) {
    const { token } = JSON.parse(stored);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  // views: 'login' | 'signup' | 'products' | 'cart' | 'orders' | 'admin'
  const [view, setView] = useState("login");

  // auth
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });

  // data
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const onAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  // ---------- AUTH ----------
  const signup = async () => {
    try {
      const { data } = await api.post("/auth/signup", authForm);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (e) {
      alert(e.response?.data?.message || "Signup failed");
    }
  };

  const login = async () => {
    try {
      const { data } = await api.post("/auth/login", {
        email: authForm.email,
        password: authForm.password,
      });
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (e) {
      alert(e.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setView("login");
  };

  // ---------- PRODUCTS ----------
  const fetchProducts = async () => {
    const { data } = await api.get("/products");
    // add local qty state per product (default 1)
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

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const placeOrder = async () => {
    if (!user) return alert("Please login first");
    if (cart.length === 0) return alert("Cart is empty");

    const items = cart.map((i) => ({
      productId: i._id,
      name: i.name,
      price: i.price,
      quantity: i.qty,
    }));
    const totalPrice = items.reduce((s, it) => s + it.price * it.quantity, 0);

    try {
      await api.post("/orders", { items, totalPrice });
      setCart([]);
      alert("✅ Order placed!");
      setView("orders");
      fetchMyOrders();
    } catch (e) {
      alert(e.response?.data?.message || "Order failed");
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

  // ---------- BOOTSTRAP ----------
  // Try to restore previous session (Remember me). Remove this if you never want auto-login.
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setView("products");
    }
  }, []);

  // fetch products when user is set (logged in)
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
            <button
              onClick={() => {
                setView("orders");
                fetchMyOrders();
              }}
            >
              My Orders
            </button>
            {user.role === "admin" && (
              <button
                onClick={() => {
                  setView("admin");
                  fetchAdminPanel();
                }}
              >
                Admin Panel
              </button>
            )}
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {/* LOGIN */}
      {!user && view === "login" && (
        <div className="auth-form">
          <h2>Login</h2>
          <input
            name="email"
            placeholder="Email"
            value={authForm.email}
            onChange={onAuthChange}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={authForm.password}
            onChange={onAuthChange}
          />
          <button onClick={login}>Login</button>
          <button onClick={() => setView("signup")}>Go to Signup</button>
        </div>
      )}

      {/* SIGNUP */}
      {!user && view === "signup" && (
        <div className="auth-form">
          <h2>Signup</h2>
          <input
            name="name"
            placeholder="Name"
            value={authForm.name}
            onChange={onAuthChange}
          />
          <input
            name="email"
            placeholder="Email"
            value={authForm.email}
            onChange={onAuthChange}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={authForm.password}
            onChange={onAuthChange}
          />
          <button onClick={signup}>Create account</button>
          <button onClick={() => setView("login")}>Go to Login</button>
        </div>
      )}

      {/* PRODUCTS */}
      {user && view === "products" && (
        <div className="product-list">
          {products.map((p) => (
            <div className="product-card" key={p._id}>
              <h3>{p.name}</h3>
              <p>₹{p.price}</p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button onClick={() => changeQty(p._id, -1)} disabled={p.qty <= 1}>
                  -
                </button>
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
                  <div>
                    {i.name} x {i.qty}
                  </div>
                  <div>₹{i.price * i.qty}</div>
                  <button onClick={() => removeFromCart(i._id)}>Remove</button>
                </div>
              ))}
              <h3>Total: ₹{cartTotal}</h3>
              <button className="place-order" onClick={placeOrder}>
                Place Order
              </button>
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
                <strong>Order #{o._id}</strong> — ₹{o.totalPrice} —{" "}
                {new Date(o.createdAt).toLocaleString()}
                <ul>
                  {o.items.map((it, idx) => (
                    <li key={idx}>
                      {it.name} x {it.quantity} = ₹{it.price * it.quantity}
                    </li>
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
              <strong>Order #{o._id}</strong> — ₹{o.totalPrice} —{" "}
              {new Date(o.createdAt).toLocaleString()} — User:{" "}
              {o.user?.name || "Unknown"}
              <ul>
                {o.items.map((it, idx) => (
                  <li key={idx}>
                    {it.name} x {it.quantity} = ₹{it.price * it.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <h2>All Users</h2>
          {allUsers.map((u) => (
            <div key={u._id} className="user-card">
              {u.name} — {u.email} — {u.role}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
