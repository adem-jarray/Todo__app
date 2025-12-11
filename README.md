Todo App (Full Stack) - Updated (Stylish UI + Full CRUD)
==========================================================



What's new:
- Edit todo text inline
- Toggle complete/uncomplete
- Delete todos
- Filter todos by All / Active / Completed
- Stylish modern UI (responsive-ish)

Structure:
- backend/   -> Node.js + Express + MongoDB (local or Atlas)
- frontend/  -> React app (single-file App.js for simplicity)

How to run:
1. Backend
   - cd backend
   - npm install
   - copy .env.example to .env and set your MONGO_URI (local or Atlas)
       MONGO_URI=mongodb://127.0.0.1:27017/todo_db
   - npm run dev   (if you have nodemon) or npm start

2. Frontend
   - cd frontend
   - npm install
   - npm start

Open http://localhost:3000

Notes:
- If you use Atlas, ensure your IP is allowed in Network Access.
- If you get CORS or connection errors, check backend log for details.
"# Todo__app" 
