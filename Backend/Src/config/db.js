const mongoose = require('mongoose')
async function main() {
  try {
    await mongoose.connect(process.env.DB_CONNECT, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: false
    })
    console.log("MongoDB Connected Successfully")
  } catch (error) {
    console.error("MongoDB Connection Error: ", error.message)
    throw error
  }
}
module.exports = main;