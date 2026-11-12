// sets every lesson back to 5 spaces and deletes all orders
// run it with: npm run reset

const { MongoClient } = require('mongodb')

const client = new MongoClient(process.env.MONGODB_URI)

async function reset() {
    await client.connect()
    const db = client.db('afterschool')

    await db.collection('lesson').updateMany({}, { $set: { space: 5 } })
    await db.collection('order').deleteMany({})

    console.log('All lessons back to 5 spaces, orders cleared')
    await client.close()
}

reset()