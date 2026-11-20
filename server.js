const express = require('express')
const cors = require('cors')
const path = require('path')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 3000

// the database link is in .env on my laptop, and in the settings on render
const client = new MongoClient(process.env.MONGODB_URI)
let db

app.use(cors())
app.use(express.json())

// logger middleware, prints every request in the console
app.use(function (req, res, next) {
    let time = new Date().toLocaleString()
    console.log(time + ' ' + req.method + ' ' + req.url)

    // for POST and PUT also print what was sent
    if (req.method == 'POST' || req.method == 'PUT') {
        console.log('   body:', req.body)
    }
    next()
})

// static file middleware,sends back lesson images from the images folder
app.use('/images', express.static(path.join(__dirname, 'images')))

// if the image wasn't found above, send an error message
app.use('/images', function (req, res) {
    res.status(404).json({ error: 'Image not found' })
})

app.get('/', function (req, res) {
    res.send('After school lessons API. Try GET /lessons')
})

// GET all lessons
app.get('/lessons', async function (req, res) {
    let lessons = await db.collection('lesson').find().toArray()
    res.json(lessons)
})

// GET one lesson
app.get('/lessons/:id', async function (req, res) {
    let lesson = await db.collection('lesson').findOne({ _id: new ObjectId(req.params.id) })
    res.json(lesson)
})

// search in topic, location, price and space
app.get('/search', async function (req, res) {
    let text = ''
    if (req.query.q) {
        text = req.query.q.toLowerCase()
    }

    let lessons = await db.collection('lesson').find().toArray()
    let results = []

    for (let i = 0; i < lessons.length; i++) {
        let lesson = lessons[i]

        // turn everything into lowercase text so we can check it
        let topic = lesson.topic.toLowerCase()
        let location = lesson.location.toLowerCase()
        let price = String(lesson.price)
        let space = String(lesson.space)

        if (topic.includes(text) || location.includes(text) || price.includes(text) || space.includes(text)) {
            results.push(lesson)
        }
    }

    res.json(results)
})

// update a lesson
app.put('/lessons/:id', async function (req, res) {
    await db.collection('lesson').updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
    )
    res.json({ message: 'Lesson updated' })
})

// save a new order
app.post('/orders', async function (req, res) {
    let order = req.body
    order.date = new Date()

    let result = await db.collection('order').insertOne(order)
    res.json({ message: 'Order saved', id: result.insertedId })
})

// GET all orders
app.get('/orders', async function (req, res) {
    let orders = await db.collection('order').find().toArray()
    res.json(orders)
})

// GET all teachers
app.get('/teachers', async function (req, res) {
    let teachers = await db.collection('teacher').find().toArray()
    res.json(teachers)
})

// GET the lessons of one teacher
app.get('/teachers/:id/lessons', async function (req, res) {
    let teacher = await db.collection('teacher').findOne({ _id: new ObjectId(req.params.id) })

    // the teacher has a list of lesson ids, get each of those lessons
    let lessons = []
    for (let i = 0; i < teacher.lessonIds.length; i++) {
        let lesson = await db.collection('lesson').findOne({ _id: new ObjectId(teacher.lessonIds[i]) })
        lessons.push(lesson)
    }

    res.json(lessons)
})

// how many spaces have been bought for a lesson
app.get('/enrolment/:lessonid', async function (req, res) {
    let lessonId = req.params.lessonid
    let orders = await db.collection('order').find().toArray()

    // go through every order and add up the spaces bought for this lesson
    let enrolment = 0
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i]

        for (let j = 0; j < order.lessons.length; j++) {
            if (order.lessons[j].lessonId == lessonId) {
                enrolment = enrolment + order.lessons[j].spaces
            }
        }
    }

    res.json({ lessonId: lessonId, enrolment: enrolment })
})

// any route that doesn't exist
app.use(function (req, res) {
    res.status(404).json({ error: 'Route not found' })
})

// if something goes wrong in a route (like a wrong id), it ends up here
app.use(function (err, req, res, next) {
    console.log('Error: ' + err.message)
    res.status(500).json({ error: 'Something went wrong' })
})

// connect to the database first, then start the server
client.connect().then(function () {
    db = client.db('afterschool')
    console.log('Connected to MongoDB')

    app.listen(PORT, function () {
        console.log('Server running on port ' + PORT)
    })
})