const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nx8jou2.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database Connected Successfully✅");

  } catch (error) {
    console.log(error.name, error.message);
  }
}
dbConnect()


const usersCollection = client.db("marshalDb").collection("users");
const classesCollection = client.db("marshalDb").collection("classes");
const cartCollection = client.db("marshalDb").collection("carts");

app.get('/', (req, res) => {
  res.send('boss is sitting');
})

app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
  res.send({ token })
})

// users related apis

app.get('/users', async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
})

app.post('/users', async (req, res) => {
  const user = req.body;
  // console.log(user);
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);
  // console.log('existing user',existingUser);
  if (existingUser) {
    return res.send({ message: 'user already exist' });
  }
  const result = await usersCollection.insertOne(user);
  res.send(result);
})

// check admin
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  if (req.decoded.email !== email) {
    return res.send({ admin: false })
  }
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === 'admin' }
  res.send(result);
})

app.patch('/users/admin/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'admin'
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
})

// check active status by admin
app.patch('/users/adminApprove/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: 'active'
    },
  };
  const result = await classesCollection.updateOne(filter, updateDoc);
  res.send(result);
})

// check denied status by admin
app.patch('/users/adminDenied/:id', async (req, res) => {
  const id = req.params.id;
  // console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: 'denied'
    },
  };
  const result = await classesCollection.updateOne(filter, updateDoc);
  res.send(result);
})


// check instructor
app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  if (req.decoded.email !== email) {
    return res.send({ instructor: false })
  }
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const result = { instructor: user?.role === 'instructor' }
  res.send(result);
})

app.patch('/users/instructor/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: 'instructor'
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
})

// add class by instructor
app.post('/addClass', async (req, res) => {
  const addClass = req.body;
  // console.log(addClass);
  const result = await classesCollection.insertOne(addClass);
  res.send(result)
})

app.get('/addClass', async (req, res) => {
  // console.log(req.query.email);
  let query = {};
  if (req.query?.email) {
    query = { instructor_email: req.query.email }
  }
  const result = await classesCollection.find(query).toArray();
  res.send(result);
})

// classes api
app.get('/classes', async (req, res) => {
  const result = await classesCollection.find().sort({ student_number: -1 }).limit(6).toArray();
  res.send(result);
})
app.get('/allClasses', async (req, res) => {
  const result = await classesCollection.find().toArray();
  res.send(result);
})
// cart collection
app.get('/carts', verifyJWT, async (req, res) => {
  const email = req.query.user_email
  // console.log("email",email);
  if (!email) {
    return res.send([]);
  }
  const decodedEmail = req.decoded.email;

  if (email !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'forbidden access' })
  }

  const query = { user_email: email };
  const result = await cartCollection.find(query).toArray();
  res.send(result);
});


app.post('/carts', async (req, res) => {
  const item = req.body;
  // console.log(item);
  const result = await cartCollection.insertOne(item);
  res.send(result);
})

app.delete('/carts/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const query = { _id: new ObjectId(id) };
  const result = await cartCollection.deleteOne(query);
  res.send(result);
})






app.listen(port, () => {
  console.log(`marshal art is sitting on port ${port}`);
})