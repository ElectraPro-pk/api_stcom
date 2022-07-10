
const express = require('express')
const app = express()
const port = 3000
var MongoClient = require('mongodb').MongoClient;
const axios = require('axios');
const bodyParser = require('body-parser');

const url = "mongodb+srv://root:Root1895@students.lvpkb.mongodb.net/?retryWrites=true&w=majority";
const teacher_url = "https://apps.iba-suk.edu.pk/stcom-student-project/public/api/teachers"
const students_url = "https://apps.iba-suk.edu.pk/stcom-student-project/public/api/students"
var TEACHERS = []
var STUDENTS = []


app.use(bodyParser.urlencoded({
  extended: true
}));

const InsertData = (coll,data)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    dbo.collection(coll).insertOne(data, function(err, res) {
      if (err) return;
      db.close();
    });
  });
}

const FindData = async (coll,query= {})=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    dbo.collection(coll).findOne(query, function(err, result) {
      if (err) return;
      return result;
      db.close();
    })
  });
}


async function LoadStudents() {
  try {
    const response = await axios.get(students_url);
    STUDENTS = response.data;  
    for(i in STUDENTS){
     st = STUDENTS[i]
     obj = {
      "_id" : st["CMSID"].trim(),
      "name":st["NAME"].trim(),
      "Friends":[],
      "Request_Sent":[],
      "Time_slots":[],
      "Status":"Offline"
     }
     InsertData("student",obj)
    }
  } catch (error) {
    console.error(error);
  }
}

async function LoadTeachers() {
  try {
    const response = await axios.get(teacher_url);
    TEACHERS = response.data;  
    for(i in TEACHERS){
     st = TEACHERS[i]
    
     obj = {
      "_id" : st["INS_ID"].trim(),
      "name":st["NAME"].trim(),
      "Friends":[],
      "Request":[],
      "Time_slots":[],
      "Status":"Offline"
     }
     InsertData("teacher",obj)
    }
  } catch (error) {
    console.error(error);
  }
}
app.post("/teacher/:id",async (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var myquery = { "_id": {"$eq":req.params.id} };
    var newvalues = { $set: req.body };
    dbo.collection("teacher").updateOne(myquery, newvalues, function(err, re) {
      if (err) res.sendStatus(500);
      res.send("Updated").status(200)
      db.close();
    });
  });
})
app.post("/feedbacks/:id",(req,res)=>{
  obj = {
    "from":req.params.id,
    "to":req.body.to,
    "feedback" : req.body.feedback
  }
  InsertData("feedbacks",obj) 
  res.sendStatus(200)
})

app.get("/feedbacks/:id",(req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"to":{"$eq":req.params.id}}
    dbo.collection("feedbacks").findOne(query, function(err, result) {
      if (err) return;
      db.close();
      if(result)
        res.send(result)
      else
        res.send({})
      
    })
  });
})

app.post("/student/:id",async (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("mydb");
    var myquery = { "_id": {"$eq":req.params.id} };
    var newvalues = { $set: req.body };
    dbo.collection("student").updateOne(myquery, newvalues, function(err, re) {
      if (err) res.sendStatus(500);
      res.send("Updated").status(200)
      db.close();
    });
  });
})


app.get("/teacher/:id",async (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.id}}
    dbo.collection("teacher").findOne(query, function(err, result) {
      if (err) return;
      db.close();
      if(result)
        res.send(result)
      else
        res.send({})
      
    })
  });
})
app.get("/student/:id",async (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.id}}
    dbo.collection("student").findOne(query, function(err, result) {
      if (err) return;
      db.close();
      if(result)
        res.send(result)
      else
        res.send({})
      
    })
  });
})

app.get("/updateData",(req,res)=>{
  LoadStudents()
  LoadTeachers()
  res.send("Students and Teachers are Updated Successfully")
})
app.get('/', (req, res) => {
  res.send('API FOR STCOM')
})

app.listen(port, () => {
  LoadStudents();
  LoadTeachers(); 
  console.log(`API Listening at  http://localhost:${port}`)
})




