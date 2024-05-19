const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('./model/userSchema')
const Product = require('./model/productSchema')
const Order = require('./model/orderSchema')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

// Connect to express
const app = express()

// Connect to MongoDB
const dbURI = process.env.passDB

mongoose.connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(()=>{
    app.listen(3001, () => {
        console.log('Server connected to port 3001 and MongoDB')
    })
}).catch((error) =>{
    console.log('Unable to connect to server')
})

// Middleware
app.use(bodyParser.json())
app.use(cors())

// Routes
// User registration
// Post
app.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body
        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = new User({ firstName, lastName, email, password:hashedPassword })
        await newUser.save()
        res.status(201).json({ message: 'User created successfully'})
    } catch(error) {
        res.status(500).json({ server: 'Error signing up' })
    }
})

// Get
app.get('/register', async (req, res) => {
    try {
        const users = await User.find()
        res.status(201).json(users)
    } catch(error) {
        res.status(500).json({ message: 'Unable to get users' })
    }
})

// Log in
// Post
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })
        if(!user){
            return res.status(401).json({ error: 'Invalid credentials' })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid){
            return res.status(401).json({ error: 'Invalid password' })
        }
        const token = jwt.sign({ userId: user._id}, process.env.ACCESS_SECRET_KEY, { expiresIn: '1hr' })
        res.json({ message: 'Login successful ', token})
    } catch(error) {
        res.status(500).json({ error: 'Error logging in' })
    }
})

// Update user profile
app.get('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select('-password'); // Exclude password from the response
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
});


//Products 
// Get
app.get('/product-list', async (req, res) => {
    try {
        const products = await Product.find()
        res.status(201).json(products)
    } catch(error) {
        res.status(500).json({ message: 'Unable to get products' })
    }
})

app.post('/product-list', async (req, res) => {
    try {
        const { prodType } = req.body
        const product = await Product.find({prodType})
        if(!product){
            return res.status(401).json({ error: 'No products found' })
        }
        res.status(200).json(product)

    } catch(error) {
        res.status(500).json({ error: 'Error in database' })
    }
})

app.post('/update-product-quantity/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { prodQuant } = req.body;
      console.log('Update Request:', req.body); // Log request body
  
      // Find the product by ID and update its quantity
      await Product.findByIdAndUpdate(id, { prodQuant });
  
      res.status(200).json({ message: 'Product quantity updated successfully' });
    } catch (error) {
      console.error('Error updating product quantity:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

app.post('/admin-page/product-listings', async (req, res) => {
    try {
        const { prodName, prodType, prodPrice, prodDesc, prodQuant, prodImage } = req.body;
        const newProduct = new Product({ prodName, prodType, prodPrice, prodDesc, prodQuant, prodImage });
        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ error: 'Error adding product' });
    }
});

app.get('/product-listings', async (req, res) => {
    try {
        const products = await Products.find()
        res.status(201).json(products)
    } catch(error) {
        res.status(500).json({ message: 'Unable to get products' })
    }
})
// Verify token
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
  
    if (authHeader) {
      const token = authHeader.split(' ')[1];
  
      if (token) {
        jwt.verify(token, process.env.ACCESS_SECRET_KEY, (err, user) => {
          if (err) {
            return res.status(403).json({ message: 'Forbidden' });
          }
          req.user = user;
          next();
        });
      } else {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };

// GET for shopping cart
let userCarts = {};
app.get('/cart-items', authenticateJWT, (req, res) => {
    try {
        const userId = req.user.userId;
        const cartItems = userCarts[userId] || [];
        res.json(cartItems);
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST for shopping cart
app.post('/cart-items', authenticateJWT, (req, res) => {
    try{
        const userId = req.user.userId;
        const newItem = req.body;
        if (!userCarts[userId]) {
            userCarts[userId] = [];
        }
        
        const existingItemIndex = userCarts[userId].findIndex(item => item.prodId === newItem.prodId);
        if (existingItemIndex !== -1) {
            userCarts[userId][existingItemIndex].prodQuant += newItem.prodQuant;
        } else {
            userCarts[userId].push(newItem);
        }
        
        res.status(201).json(userCarts[userId]);
    }catch(err){
        res.status(403).json({ message: 'Forbidden' })
    }
});

// DELETE for shopping cart
app.delete('/remove-cart-item', authenticateJWT, (req, res) => {
    try {
      const userId = req.user.userId;
      const { prodId } = req.body;
      if (!userCarts[userId]) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      userCarts[userId] = userCarts[userId].filter(item => item.prodId !== prodId);
      res.status(200).json(userCarts[userId]);
    } catch (error) {
      console.error('Error removing cart item:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

//POST for order transaction
app.post('/order-transaction', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const cartItems = userCarts[userId];

        if (!cartItems || cartItems.length === 0) {
            return res.status(404).json({ message: 'Cart is already empty' });
        }

        // Generate unique transaction ID and save each cart item as an order
        const orders = cartItems.map(item => {
            let genId = uuidv4();
            let uniqueId = 'CMSC' + genId.slice(0, 6);
            return {
                ordTransId: uniqueId,
                ordProdId: item.prodId,
                ordQty: item.prodQuant,
                ordStatus: 'Pending',
                email: userId,
                ordDate: new Date(),
                time: new Date().toISOString()
            };
        });

        Order.insertMany(orders);

        // Clear the user's cart
        userCarts[userId] = [];

        res.status(200).json({ message: 'All cart items have been removed and orders placed' });
    } catch (error) {
        console.error('Error clearing cart items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET for order transaction
app.get('/order-transaction', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const orders = await Order.find({email: userId}).populate('ordProdId').exec();
        console.log(ordProdId.prodName)
        console.log(ordProdId)        

        if (!orders.length) {
            return res.status(404).json({ message: 'No order transactions found for this user' });
        }

        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching order transactions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// DELETE for order transaction
app.delete('/order-transaction/:orderId', authenticateJWT, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.user.userId;

        // Check if the order belongs to the authenticated user
        const order = await Order.findOne({ ordTransId: orderId, email: userId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }

        // Remove the order from the database
        await Order.findOneAndDelete(orderId);

        res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});