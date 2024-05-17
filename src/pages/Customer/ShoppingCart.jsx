
import axios from 'axios';
import React, { useEffect, useState } from 'react';

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
    useEffect(() => {
      fetchCartItems();
    }, []);
  
    const fetchCartItems = async () => {
      try {
        const token = localStorage.getItem('token'); // Retrieve the token from local storage
        const response = await axios.get('http://localhost:3001/cart-items', {
          headers: {
            'authorization': `Bearer ${token}`
          }
        });
        setCartItems(response.data); // Set cart items from response
        calculateTotal(response.data)
      } catch (error) {
        console.error('Error fetching cart items:', error.response ? error.response.data : error.message);
      }
    };
  
  const calculateTotal = (items) => {
    const totalPrice = items.reduce((acc, item) => acc + (item.prodPrice * item.prodQuant), 0);
    setTotal(totalPrice);
  };

  return (
    <>
    <div className='headerCustomer'></div>
    <div className='titleCustomer'>
      <h1>SHOPPING CART</h1>
    </div>
    <hr/>
    <div>
      <h2>Cart Items</h2>
      {cartItems.length === 0 ? (
        <p>No items in the cart.</p>
      ) : (
        <ul>
          {cartItems.map((item) => (
            <li key={item.prodId}>
              <img src={item.prodImage} alt={item.prodName} width="50" />
              <h3>{item.prodName}</h3>
              <p>Price: ${item.prodPrice}</p>
              <button>REMOVE</button>
            </li>
          ))}
          <div>
            <h2>Total: {total}</h2>
          </div>
        </ul>
      )}
    </div>
    </>

  );
};

export default ShoppingCart;
