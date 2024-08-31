const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000


app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ccnzlu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Get the database and collection on which to run the operation
        const userCollection = client.db("food_canvas_db").collection("users");
        const menuCollection = client.db("food_canvas_db").collection("menu");
        const reviewCollection = client.db("food_canvas_db").collection("reviews");
        const cartCollection = client.db("food_canvas_db").collection("carts")

        //jwt related api
        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body;
                const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                    expiresIn: '1h'
                });
                res.send({ token });
            } catch (error) {
                console.error('Error generating JWT:', error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        })

        // Middleware to verify JWT
        const verifyToken = async (req, res, next) => {
            try {
                if (!req.headers.authorization) {
                    return res.status(401).send({ message: "Forbidden access" });
                }
                const token = req.headers.authorization.split(' ')[1];
                jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                    if (err) {
                        return res.status(401).send({ message: "unauthorized access" });
                    }
                    req.decoded = decoded;
                    next();
                });
            } catch (error) {
                console.error('Error in token verification:', error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        };
        //use verify admin 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            next()
        }


        //users api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "unauthorized access" })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })


        app.post('/users', async (req, res) => {
            const user = req.body
            // insert email if user doesnt existes
            // you can do this many ways (email unique, 2. upsert 3. simple checking)
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query)
            res.send(result)
        })
        //menu related apis
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body
            const result = await menuCollection.insertOne(item)
            res.send(result)
        })
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Received ID:', id); // Log the ID to verify
        
            try {
                const query = { _id: new ObjectId(id) };
                const result = await menuCollection.findOne(query);
                console.log('Query Result:', result);
        
                if (!result) {
                    return res.status(404).send({ message: 'Menu item not found' });
                }
        
                res.send(result);
            } catch (error) {
                console.error('Error:', error);
                res.status(500).send({ message: 'Server error' });
            }
        });
        app.patch("/menu/:id", async (req, res) => {
            const item = req.body
            console.log(id)
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }
            console.log(updatedDoc)
            const result = await menuCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })


     

        app.delete('/menu/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query)
            res.send(result)
        })


        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        // carts
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            console.log(cartItem);
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })

        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("An error occurred while connecting to MongoDB:", error);
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('FOOD CANVAS IS RUNNING...')
})

app.listen(port, () => {
    console.log(`FOOD CANVAS app listening on port ${port}`)
})


