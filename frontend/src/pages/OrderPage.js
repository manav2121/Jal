import { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

export default function OrderPage() {
  const { user } = useContext(AuthContext);
  const [message, setMessage] = useState("");

  const placeOrder = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/orders",
        { items: ["Water Jar"], total: 100 },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMessage("✅ Order placed: " + res.data._id);
    } catch (err) {
      setMessage("❌ " + err.response.data.message);
    }
  };

  if (!user) return <p>Please login to place orders.</p>;

  return (
    <div>
      <h2>Place an Order</h2>
      <button onClick={placeOrder}>Order Now</button>
      <p>{message}</p>
    </div>
  );
}
