const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 3000

// connection string comes from the .env file locally, and from the
// environment settings on render.com when it's hosted
const client = new MongoClient(process.env.MONGODB_URI)
let db

app.use(cors())
app.use(express.json())

// logger middleware - prints every request to the console
app.use((req, res, next) => {
    const time = new Date().toLocaleString()
    console.log(`[${time}] ${req.method} ${req.url}`)

    // for POST and PUT also show what was sent
    if (req.method == 'POST' || req.method == 'PUT') {
        console.log('   body:', JSON.stringify(req.body))
    }
    next()
})

// static file middleware for the lesson images
// e.g. /images/maths.jpg sends back images/maths.jpg
const imagesFolder = path.join(__dirname, 'images')

app.use('/images', (req, res) => {
    const filePath = path.join(imagesFolder, req.path)

    // stop people doing /images/../server.js
    if (!filePath.startsWith(imagesFolder)) {
        return res.status(403).json({ error: 'Not allowed' })
    }

    fs.stat(filePath, (err, fileInfo) => {
        if (err || !fileInfo.isFile()) {
            return res.status(404).json({ error: 'Image not found: ' + req.path })
        }
        res.sendFile(filePath)
    })
})

app.get('/', (req, res) => {
    res.send('After school lessons API. Try GET /lessons')
})

// GET all lessons
app.get('/lessons', async (req, res) => {
    const lessons = await db.collection('lesson').find().toArray()
    res.json(lessons)
})

// search on topic, location, price or space
// e.g. /search?q=port
app.get('/search', async (req, res) => {
    const q = (req.query.q || '').trim()

    // nothing typed in so just send everything back
    if (q == '') {
        const lessons = await db.collection('lesson').find().toArray()
        return res.json(lessons)
    }

    // escape characters like ( or + so they don't break the regex
    const text = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const lessons = await db.collection('lesson').find({
        $or: [
            { topic: { $regex: text, $options: 'i' } },
            { location: { $regex: text, $options: 'i' } },
            // price and space are numbers so turn them into text first
            { $expr: { $regexMatch: { input: { $toString: '$price' }, regex: text } } },
            { $expr: { $regexMatch: { input: { $toString: '$space' }, regex: text } } }
        ]
    }).toArray()

    res.json(lessons)
})

// update any field of a lesson, e.g. { "space": 3 }
app.put('/lessons/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid lesson id' })
    }

    const changes = req.body
    delete changes._id // the id should never change

    const result = await db.collection('lesson').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: changes }
    )

    if (result.matchedCount == 0) {
        return res.status(404).json({ error: 'Lesson not found' })
    }
    res.json({ message: 'Lesson updated' })
})

// save a new order
app.post('/orders', async (req, res) => {
    const order = req.body

    if (!order.name || !order.phone || !order.lessons || order.lessons.length == 0) {
        return res.status(400).json({ error: 'Order needs a name, phone and at least one lesson' })
    }

    order.date = new Date()
    const result = await db.collection('order').insertOne(order)
    res.status(201).json({ message: 'Order saved', id: result.insertedId })
})

// all orders (handy for checking things worked)
app.get('/orders', async (req, res) => {
    const orders = await db.collection('order').find().toArray()
    res.json(orders)
})

// all teachers
app.get('/teachers', async (req, res) => {
    const teachers = await db.collection('teacher').find().toArray()
    res.json(teachers)
})

// lessons taught by one teacher
app.get('/teachers/:id/lessons', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid teacher id' })
    }

    const teacher = await db.collection('teacher').findOne({ _id: new ObjectId(req.params.id) })
    if (!teacher) {
        return res.status(404).json({ error: 'Teacher not found' })
    }

    const ids = teacher.lessonIds.map(id => new ObjectId(id))
    const lessons = await db.collection('lesson').find({ _id: { $in: ids } }).toArray()
    res.json(lessons)
})

// how many spaces have been bought for a lesson
app.get('/enrolment/:lessonid', async (req, res) => {
    const lessonId = req.params.lessonid

    const orders = await db.collection('order').find({ 'lessons.lessonId': lessonId }).toArray()

    let enrolment = 0
    for (const order of orders) {
        for (const item of order.lessons) {
            if (item.lessonId == lessonId) {
                enrolment += item.spaces
            }
        }
    }

    res.json({ lessonId: lessonId, enrolment: enrolment })
})

// anything else
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' })
})

// if something goes wrong in a route it ends up here
app.use((err, req, res, next) => {
    console.log('Error:', err.message)
    res.status(500).json({ error: 'Something went wrong on the server' })
})

// connect to the database first, then start the server
client.connect()
    .then(() => {
        db = client.db('afterschool')
        console.log('Connected to MongoDB')
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}/`)
        })
    })
    .catch(err => {
        console.log('Could not connect to MongoDB:', err.message)
    })
