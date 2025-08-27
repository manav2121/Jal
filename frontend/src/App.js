import React, { useEffect, useState } from "react";
import { api } from "./api";
import "./App.css";

function App() {
  const [view, setView] = useState("login"); // login | signup | products | cart | orders | admin
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const onChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  const signup = async () => {
    try {
      const { data } = await api.post("/auth/signup", authForm);
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (e) { alert(e.response?.data?.message || "Signup failed"); }
  };

  const login = async () => {
    try {
      const { data } = await api.post("/auth/login", { email: authForm.email, password: authForm.password });
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      setView("products");
    } catch (e) { alert(e.response?.data?.message || "Login failed"); }
  };

  const logout = () => { localStorage.removeItem("user"); setUser(null); setView("login"); };

  const fetchProducts = async () => {
    const { data } = await api.get("/products");
    setProducts(data.map(p => ({ ...p, qty: 1 })));
  };

  const addToCart = (prod) => {
    setCart((prev) => {
      const exist = prev.find(i => i._id === prod._id);
      if (exist) return prev.map(i => i._id === prod._id ? { ...i, qty: i.qty + prod.qty } : i);
      return [...prev, { ...prod }];
    });
  };

  const changeQty = (id, delta) => {
    setProducts(prev => prev.map(p => p._id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p));
  };

  const placeOrder = async () => {
    if (!user) return alert("Login first");
    if (cart.length === 0) return alert("Cart is empty");
    const items = cart.map(c => ({ productId: c._id, name: c.name, price: c.price, quantity: c.qty }));
    const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
    try {
      await api.post("/orders", { items, totalPrice });
      setCart([]);
      alert("Order placed");
    } catch (e) { alert(e.response?.data?.message || "Order failed"); }
  };

  const fetchMyOrders = async () => {
    const { data } = await api.get("/orders/my-orders");
    setMyOrders(data);
  };

  const fetchAdmin = async () => {
    const [ordersRes, usersRes] = await Promise.all([
      api.get("/orders"),
      api.get("/auth/users")
    ]);
    setAllOrders(ordersRes.data);
    setAllUsers(usersRes.data);
  };

  // Try auto-restore user (remember-me behavior). Remove this block if you want no auto-login.
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setView("products");
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [user]);

  return (
    <div className="App">
      <header>
        <h1>💧 Water Jar Store</h1>
        {user ? (
          <div>
            Welcome, {user.name} ({user.role})
            <button onClick={() => setView("products")}>Products</button>
            <button onClick={() => setView("cart")}>Cart ({cart.length})</button>
            <button onClick={() => { setView("orders"); fetchMyOrders(); }}>My Orders</button>
            {user.role === "admin" && (
              <button onClick={() => { setView("admin"); fetchAdmin(); }}>Admin Panel</button>
            )}
            <button onClick={logout}>Logout</button>
          </div>
        ) : null}
      </header>

      {!user && view === "login" && (
        <div className="auth-form">
          <h2>Login</h2>
          <input name="email" placeholder="Email" value={authForm.email} onChange={onChange}/>
          <input name="password" type="password" placeholder="Password" value={authForm.password} onChange={onChange}/>
          <button onClick={login}>Login</button>
          <button onClick={() => setView("signup")}>Go to Signup</button>
        </div>
      )}

      {!user && view === "signup" && (
        <div className="auth-form">
          <h2>Signup</h2>
          <input name="name" placeholder="Name" value={authForm.name} onChange={onChange}/>
          <input name="email" placeholder="Email" value={authForm.email} onChange={onChange}/>
          <input name="password" type="password" placeholder="Password" value={authForm.password} onChange={onChange}/>
          <button onClick={signup}>Create account</button>
          <button onClick={() => setView("login")}>Go to Login</button>
        </div>
      )}

      {user && view === "products" && (
        <div className="product-list">
          {products.map(p => (
            <div className="product-card" key={p._id}>
              <h3>{p.name}</h3>
              <p>₹{p.price}</p>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                <button onClick={() => changeQty(p._id, -1)} disabled={p.qty <= 1}>-</button>
                <span>{p.qty}</span>
                <button onClick={() => changeQty(p._id, 1)}>+</button>
              </div>
              <button onClick={() => addToCart(p)}>Add to cart</button>
            </div>
          ))}
        </div>
      )}

      {user && view === "cart" && (
        <div>
          <h2>Cart</h2>
          {cart.length === 0 ? <p>Cart is empty</p> : (
            <>
              {cart.map(i => (
                <div className="cart-item" key={i._id}>
                  <div>{i.name} x {i.qty}</div>
                  <div>₹{i.price * i.qty}</div>
                </div>
              ))}
              <h3>Total: ₹{cart.reduce((s, i) => s + i.price * i.qty, 0)}</h3>
              <button className="place-order" onClick={placeOrder}>Place Order</button>
            </>
          )}
        </div>
      )}

      {user && view === "orders" && (
        <div>
          <h2>My Orders</h2>
          {myOrders.length === 0 ? <p>No orders yet</p> : myOrders.map(o => (
            <div key={o._id} className="order-card">
              <strong>Order #{o._id}</strong> — ₹{o.totalPrice} — {new Date(o.createdAt).toLocaleString()}
              <ul>
                {o.items.map((it, idx) => (
                  <li key={idx}>{it.name} x {it.quantity} = ₹{it.price * it.quantity}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {user && view === "admin" && (
        <div className="admin-panel">
          <h2>Admin — All Orders</h2>
          {allOrders.map(o => (
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
          {allUsers.map(u => (
            <div key={u._id} className="user-card">{u.name} — {u.email} — {u.role}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
