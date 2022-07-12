
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
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


async function LoadStudents() {
  try {
    const response = await axios.get(students_url);
    STUDENTS = response.data;  
    for(i in STUDENTS){
     st = STUDENTS[i]
     obj = {
      "_id" : st["CMSID"].trim(),
      "name":st["NAME"].trim(),
      "friends":[],
      "requests":[],
      "time_slots":[],
      "status":"Offline"
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
      "friends":[],
      "requests":[],
      "time_slots":[],
      "status":"Offline"
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
    "name":req.body.name,
    "to":req.body.to,
    "feedback" : req.body.feedback
  }
  InsertData("feedbacks",obj) 
  res.sendStatus(200)
})

app.get("/feedbacks/:id", (req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"to":{"$eq":req.params.id}}
    const feeds = dbo.collection("feedbacks").find(query,{sort: { title: 1 }})
    let r = [];
    await feeds.forEach(e =>{
     r.push(e)
    })
    res.send(r).status(200);
    //db.close();
  });
})
app.get("/teacher/get-request/:id",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.id}}
    dbo.collection("teacher").findOne(query,async function(err,rq){
      if (err) res.send(err.message).status(500)
    request_list = []
    for(i in rq["requests"]){
      re = await rq["requests"][i]
      request_list.push(re)
    }
    res.send(request_list).status(200);
    })
    
    //db.close();
  });
})
app.get("/student/add-request/:id/:to", (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var myquery = { "_id": {"$eq":req.params.id} };
    var newvalues = { $push: {"requests":req.params.to} };
    dbo.collection("student").updateOne(myquery, newvalues, async function(err, re) {
      if (err) res.send(err.message).Status(500);
      
      
      const stu = await dbo.collection("student").findOne(myquery,{sort: { _id: 1 }})
        console.log(stu)
        var query1 = {"_id":{"$eq":req.params.to}}
        var obj = {
          "CMSID":req.params.id,
          "name":stu["name"]
        }
        var newValue1 = {$push:{"requests":obj}}
        dbo.collection("teacher").updateOne(query1,newValue1,function(err,r){
          if(err) res.send(err.message).Status(500);
          res.send("Updated").status(200)
          db.close();
        })
    });
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
        res.send([])
      
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
        res.send([])
      
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




