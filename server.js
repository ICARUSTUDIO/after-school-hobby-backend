const express = require('express')
const cors = require('cors')
const path = require('path')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 3000

// the connection string is in .env on my laptop, and in the settings on render
const client = new MongoClient(process.env.MONGODB_URI)
let db

app.use(cors())
app.use(express.json())

// logger middleware - prints every request to the console
app.use((req, res, next) => {
    console.log(new Date().toLocaleString(), req.method, req.url)
    if (req.method == 'POST' || req.method == 'PUT') {
        console.log('   body:', req.body)
    }
    next()
})

// static file middleware - /images/maths.jpg sends back the file in the images folder
app.use('/images', express.static(path.join(__dirname, 'images')))

// if the image wasn't found above, this sends an error message instead
app.use('/images', (req, res) => {
    res.status(404).json({ error: 'Image not found' })
})

app.get('/', (req, res) => {
    res.send('After school lessons API. Try GET /lessons')
})

// GET all lessons
app.get('/lessons', async (req, res) => {
    const lessons = await db.collection('lesson').find().toArray()
    res.json(lessons)
})

// search topic, location, price and space, e.g. /search?q=port
app.get('/search', async (req, res) => {
    const q = (req.query.q || '').toLowerCase()
    const lessons = await db.collection('lesson').find().toArray()

    // keep the lessons where any of the 4 fields has the search text in it
    const results = lessons.filter(lesson =>
        lesson.topic.toLowerCase().includes(q) ||
        lesson.location.toLowerCase().includes(q) ||
        String(lesson.price).includes(q) ||
        String(lesson.space).includes(q)
    )
    res.json(results)
})

// update any field of a lesson, e.g. { "space": 3 }
app.put('/lessons/:id', async (req, res) => {
    await db.collection('lesson').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
    )
    res.json({ message: 'Lesson updated' })
})

// save a new order
app.post('/orders', async (req, res) => {
    const order = req.body
    order.date = new Date()
    const result = await db.collection('order').insertOne(order)
    res.json({ message: 'Order saved', id: result.insertedId })
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
    const teacher = await db.collection('teacher').findOne({ _id: new ObjectId(req.params.id) })

    // the teacher stores the ids of their lessons, so get those lessons
    const ids = teacher.lessonIds.map(id => new ObjectId(id))
    const lessons = await db.collection('lesson').find({ _id: { $in: ids } }).toArray()
    res.json(lessons)
})

// how many spaces have been bought for a lesson
app.get('/enrolment/:lessonid', async (req, res) => {
    const lessonId = req.params.lessonid
    const orders = await db.collection('order').find().toArray()

    // go through every order and add up the spaces bought for this lesson
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

// if anything goes wrong in a route (e.g. a bad id), it ends up here
app.use((err, req, res, next) => {
    console.log('Error:', err.message)
    res.status(500).json({ error: 'Something went wrong' })
})

// connect to the database first, then start the server
client.connect().then(() => {
    db = client.db('afterschool')
    console.log('Connected to MongoDB')
    app.listen(PORT, () => {
        console.log('Server running on port ' + PORT)
    })
})