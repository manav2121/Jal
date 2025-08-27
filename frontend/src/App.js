import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

// ✅ Always use API_BASE
const API_BASE = process.env.REACT_APP_API_URL || "https://jal-yc0r.onrender.com";

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/products`);
      setProducts(data.map(p => ({ ...p, qty: 1 })));
      setView("products");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignup = async () => {
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/signup`, authForm);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (err) {
      alert(err.response?.data?.message || "Signup failed");
    }
  };

  const handleLogin = async () => {
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/login`, {
        email: authForm.email,
        password: authForm.password,
      });
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setView("login");
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p =>
          p._id === product._id ? { ...p, qty: p.qty + product.qty } : p
        );
      }
      return [...prev, { ...product }];
    });
  };

  const changeQty = (id, delta) => {
    setProducts(prev =>
      prev.map(p => p._id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p)
    );
  };

  const fetchMyOrders = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setOrders(data);
      setView("my-orders");
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [ordersRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/api/orders`, { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get(`${API_BASE}/api/auth/users`, { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      setAllOrders(ordersRes.data);
      setAllUsers(usersRes.data);
      setView("admin");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>💧 Water Jar Store</h1>
        {user && (
          <div>
            Welcome, {user.name} ({user.role})
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {!user && view === "login" && (
        <div>
          <h2>Login</h2>
          <input placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
          <input placeholder="Password" type="password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button onClick={handleLogin}>Login</button>
          <p>
            Don't have an account?{" "}
            <button onClick={() => setView("signup")}>Sign up</button>
          </p>
        </div>
      )}

      {!user && view === "signup" && (
        <div>
          <h2>Sign Up</h2>
          <input placeholder="Name" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
          <input placeholder="Email" onChange={e => setAuthForm({...authForm, email: e.target.value})} />
          <input placeholder="Password" type="password" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
          <button onClick={handleSignup}>Sign Up</button>
          <p>
            Already have an account?{" "}
            <button onClick={() => setView("login")}>Login</button>
          </p>
        </div>
      )}

      {user && (
        <nav style={{ margin: "20px 0" }}>
          <button onClick={() => setView("products")}>Products</button>
          <button onClick={() => setView("cart")}>Cart ({cart.length})</button>
          <button onClick={fetchMyOrders}>My Orders</button>
          {user.role === "admin" && <button onClick={fetchAdminData}>Admin Panel</button>}
        </nav>
      )}

      {view === "products" && (
        <div className="product-list">
          {products.map(product => (
            <div key={product._id} className="product-card">
              <h3>{product.name}</h3>
              <p>₹{product.price}</p>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                <button onClick={() => changeQty(product._id, -1)} disabled={product.qty <= 1}>-</button>
                <span>{product.qty}</span>
                <button onClick={() => changeQty(product._id, 1)}>+</button>
              </div>
              <button onClick={() => addToCart(product)}>Add to cart</button>
            </div>
          ))}
        </div>
      )}

      {view === "cart" && (
        <div>
          <h2>Cart</h2>
          {cart.length === 0 ? (
            "Cart is empty"
          ) : (
            <>
              {cart.map(item => (
                <div key={item._id}>
                  {item.name} x {item.qty} = ₹{item.price * item.qty}
                </div>
              ))}
              <h3>
                Total: ₹{cart.reduce((sum, item) => sum + item.price * item.qty, 0)}
              </h3>
              <button
                onClick={async () => {
                  try {
                    const { data } = await axios.post(
                      `${API_BASE}/api/orders`,
                      { items: cart },
                      { headers: { Authorization: `Bearer ${user.token}` } }
                    );
                    alert("✅ Order placed successfully!");
                    setCart([]);
                    setOrders(prev => [...prev, data]);
                    setView("my-orders");
                  } catch (err) {
                    alert(err.response?.data?.message || "Order failed");
                  }
                }}
              >
                Checkout
              </button>
            </>
          )}
        </div>
      )}

      {view === "my-orders" && (
        <div>
          <h2>My Orders</h2>
          {orders.length === 0 ? "No orders yet" : orders.map(o => (
            <div key={o._id} className="order-card">
              Order #{o._id} — ₹{o.totalPrice} — {new Date(o.createdAt).toLocaleString()}
              <div>{o.items.map(i => `${i.name} x ${i.quantity} = ₹${i.price * i.quantity}`).join(", ")}</div>
            </div>
          ))}
        </div>
      )}

      {view === "admin" && (
        <div>
          <h2>Admin Panel</h2>
          <h3>All Orders</h3>
          {allOrders.map(o => (
            <div key={o._id} className="order-card">
              Order #{o._id} — ₹{o.totalPrice} — {new Date(o.createdAt).toLocaleString()} — User: {o.user?.name || "Unknown"}
              <div>{o.items.map(i => `${i.name} x ${i.quantity} = ₹${i.price * i.quantity}`).join(", ")}</div>
            </div>
          ))}
          <h3>All Users</h3>
          {allUsers.map(u => (
            <div key={u._id}>{u.name} — {u.email} — {u.role}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
