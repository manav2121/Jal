import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user?.role === "admin") {
      axios
        .get("http://localhost:5000/api/orders", {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        .then((res) => setOrders(res.data))
        .catch((err) => console.error(err));
    }
  }, [user]);

  if (!user) return <p>Please login as admin.</p>;
  if (user.role !== "admin") return <p>❌ Access Denied. Admins only.</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      {orders.map((order) => (
        <div key={order._id}>
          <p>User: {order.user.username}</p>
          <p>Total: {order.total}</p>
        </div>
      ))}
    </div>
  );
}
