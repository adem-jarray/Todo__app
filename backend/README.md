Backend (Node.js + Express + MongoDB)
------------------------------------

1. Install dependencies:
   cd backend
   npm install

2. Create a MongoDB (local or Atlas).
   Example local .env:
     MONGO_URI=mongodb://127.0.0.1:27017/todo_db

   Example Atlas .env:
     MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/todo_db?retryWrites=true&w=majority

3. Copy .env.example to .env and paste your connection string.

4. Start the server:
   npm run dev   # if you have nodemon
   or
   npm start

The backend will run on port 5000 by default.
