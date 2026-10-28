// puts the starting lessons and teachers into the database
// run it with: npm run seed
// WARNING: this deletes what's already in the lesson, teacher and order collections

const { MongoClient } = require('mongodb')

const client = new MongoClient(process.env.MONGODB_URI)

const lessons = [
    {
        topic: 'Maths', location: 'Port Louis', price: 2500, space: 5,
        icon: 'fa-solid fa-calculator', image: 'maths.jpg',
        description: 'Small group maths lessons to help with homework and build confidence with numbers.',
        time: 'Mondays, 4pm - 5pm', ages: '8 - 14',
        learn: ['Times tables and mental maths', 'Fractions and decimals', 'Problem solving']
    },
    {
        topic: 'English', location: 'Rose Hill', price: 2000, space: 5,
        icon: 'fa-solid fa-book', image: 'english.jpg',
        description: 'Reading and writing lessons that make kids enjoy books and stories.',
        time: 'Tuesdays, 4pm - 5pm', ages: '7 - 13',
        learn: ['Reading comprehension', 'Creative writing', 'Spelling and grammar']
    },
    {
        topic: 'Science', location: 'Quatre Bornes', price: 2200, space: 5,
        icon: 'fa-solid fa-flask', image: 'science.jpg',
        description: 'Hands on experiments that show how the world works.',
        time: 'Wednesdays, 4pm - 5:30pm', ages: '9 - 14',
        learn: ['Simple experiments', 'Plants and animals', 'Forces and energy']
    },
    {
        topic: 'Music', location: 'Curepipe', price: 2800, space: 5,
        icon: 'fa-solid fa-music', image: 'music.jpg',
        description: 'Learn to play keyboard and read music in a fun group class.',
        time: 'Thursdays, 5pm - 6pm', ages: '6 - 14',
        learn: ['Basic keyboard', 'Reading music notes', 'Rhythm and singing']
    },
    {
        topic: 'Art', location: 'Port Louis', price: 1800, space: 5,
        icon: 'fa-solid fa-palette', image: 'art.jpg',
        description: 'Drawing and painting classes where kids get to be creative.',
        time: 'Fridays, 4pm - 5pm', ages: '5 - 12',
        learn: ['Drawing basics', 'Painting with colours', 'Making their own art pieces']
    },
    {
        topic: 'Coding', location: 'Ebene', price: 3500, space: 5,
        icon: 'fa-solid fa-laptop-code', image: 'coding.jpg',
        description: 'Kids learn to make their own simple games and websites.',
        time: 'Saturdays, 10am - 12pm', ages: '10 - 16',
        learn: ['Scratch and block coding', 'Intro to HTML', 'Making a simple game']
    },
    {
        topic: 'Football', location: 'Vacoas', price: 1500, space: 5,
        icon: 'fa-solid fa-futbol', image: 'football.jpg',
        description: 'Fun football training to keep kids active and working as a team.',
        time: 'Saturdays, 9am - 10:30am', ages: '6 - 14',
        learn: ['Passing and shooting', 'Teamwork', 'Small matches']
    },
    {
        topic: 'Swimming', location: 'Flic en Flac', price: 2400, space: 5,
        icon: 'fa-solid fa-person-swimming', image: 'swimming.jpg',
        description: 'Swimming lessons with qualified coaches, from beginners up.',
        time: 'Sundays, 9am - 10am', ages: '5 - 14',
        learn: ['Water confidence', 'Basic strokes', 'Water safety']
    },
    {
        topic: 'Chess', location: 'Rose Hill', price: 1200, space: 5,
        icon: 'fa-solid fa-chess', image: 'chess.jpg',
        description: 'Learn chess from scratch and play against other kids.',
        time: 'Wednesdays, 5pm - 6pm', ages: '7 - 16',
        learn: ['How each piece moves', 'Simple strategies', 'Friendly games']
    },
    {
        topic: 'Drama', location: 'Curepipe', price: 1600, space: 5,
        icon: 'fa-solid fa-masks-theater', image: 'drama.jpg',
        description: 'Acting games and short plays that help kids speak with confidence.',
        time: 'Thursdays, 4pm - 5pm', ages: '7 - 14',
        learn: ['Acting games', 'Speaking in front of people', 'A short play at the end']
    }
]

// which topics each teacher takes
const teachers = [
    { firstName: 'Priya', lastName: 'Ramgoolam', topics: ['Maths', 'Science', 'Coding'] },
    { firstName: 'Marc', lastName: 'Laval', topics: ['English', 'Drama'] },
    { firstName: 'Anita', lastName: 'Seewoo', topics: ['Music', 'Art'] },
    { firstName: 'Kevin', lastName: 'Bhugaloo', topics: ['Football', 'Swimming'] },
    { firstName: 'Sarah', lastName: 'Li', topics: ['Chess'] }
]

async function seed() {
    await client.connect()
    const db = client.db('afterschool')

    // start fresh
    await db.collection('lesson').deleteMany({})
    await db.collection('teacher').deleteMany({})
    await db.collection('order').deleteMany({})

    const result = await db.collection('lesson').insertMany(lessons)
    console.log(result.insertedCount + ' lessons added')

    // insertMany adds the _id onto each lesson object, so we can use it here
    const teacherDocs = teachers.map(teacher => {
        const ids = lessons
            .filter(lesson => teacher.topics.includes(lesson.topic))
            .map(lesson => lesson._id.toString())

        return { firstName: teacher.firstName, lastName: teacher.lastName, lessonIds: ids }
    })

    await db.collection('teacher').insertMany(teacherDocs)
    console.log(teacherDocs.length + ' teachers added')

    await client.close()
}

seed().catch(err => {
    console.log('Seeding failed:', err.message)
    client.close()
})
