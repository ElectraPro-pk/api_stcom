
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
var MongoClient = require('mongodb').MongoClient;
const axios = require('axios');
const bodyParser = require('body-parser');
const { MongoDBNamespace } = require('mongodb');
const sgMail = require('@sendgrid/mail')
const cors = require('cors');
sgMail.setApiKey("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")
app.use(cors({
  origin:'https://apistcom.herokuapp.com'
}));
const url = "mongodb+srv://root:Root1895@students.lvpkb.mongodb.net/?retryWrites=true&w=majority";
const teacher_url = "https://apps.iba-suk.edu.pk/stcom-student-project/public/api/teachers"
const students_url = "https://apps.iba-suk.edu.pk/stcom-student-project/public/api/students"
var TEACHERS = []
var STUDENTS = []

const findStudent = (key)=>{
  for(i = 0 ;i< STUDENTS.length;i++){
    if(STUDENTS[i]["CMSID"].includes(key)){
      return STUDENTS[i]
   }
  }
}
const findTeacher = (key)=>{
  for(i = 0 ;i< TEACHERS.length;i++){
    if(TEACHERS[i]["INS_ID"].includes(key)){
      return TEACHERS[i]
   }
  }
}
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
    STUDENTS = await response.data;  
    for(i in STUDENTS){
     st = STUDENTS[i]
     
     obj = {
      "_id" : st["CMSID"].trim(),
      "name":st["NAME"].trim(),
      "friends":[],
      "department":st["DEPARTMENT"].trim(),
      "requests":[],
      "time_slots":[],
      "status":"Offline",
      "messages":[]
     }
  
     InsertData("student",obj)
    }
  } catch (error) {
    console.error(error);
  }
}
async function clearData(){
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    dbo.collection("teacher").deleteMany({});
    dbo.collection("student").deleteMany({});
  });
}
async function LoadTeachers() {
  try {
    
    const response = await axios.get(teacher_url);
    TEACHERS = await response.data;  
    for(i in TEACHERS){
     st = TEACHERS[i]
    
     obj = {
      "_id" : st["INS_ID"].trim(),
      "name":st["NAME"].trim(),
      "friends":[],
      "requests":[],
      "time_slots":[],
      "status":"Offline",
      "messages":[]
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
app.post("/teacher/allocate-time/:INS_ID",(req,res)=>{
  const uuid = require('uuid');
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let teacher_query = {"_id":{"$eq":req.params.INS_ID}} 
    let student_query = {"_id":{"$eq":req.body.toID}} 
    let slot = {
      "uid":uuid.v1().split("-")[0],
      "CMSID":req.body.toID,
      "stu_Name":req.body.toName,
      "INS_ID":req.params.INS_ID,
      "tch_Name":req.body.fromName,
      "time":req.body.time,
      "date":req.body.date,
      "subject":req.body.title
    }
    let S =  {
      $push:{"time_slots":slot}
    }
    dbo.collection("teacher").updateOne(teacher_query,S,function(err,r){
      dbo.collection("student").updateOne(student_query,S,function(e,rs){
        res.send("Allocated").status(200);
      })
    });
    
})
})
const deleteFromStudent = (id,uid)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"CMSID":id}
    let stu = await dbo.collection("student").find(query,{sort: { title: 1 }})
    let slots = []
    await stu.forEach(e =>{
      slots = stu["time_slots"]
    })
    let INS_ID = "";
    for(i = 0;i<slots.length;i++){
      if(slots[i]["uid"] == uid){
        INS_ID = slots[i]["INS_ID"]
        slots.pop(i);
      }
    }
    var updateSlot = {"$set":{"time_slots":slots}}
    dbo.collection("student").updateOne(query,updateSlot,async function(e,r){

      var query1 = {"INS_ID":INS_ID};
      var tch = dbo.collection("teacher").find(query1,{sort: { title: 1 }})
      let slotsq = []
      await tch.forEach(e=>{
      slotsq = tch["time_slots"]
      })
      
      for(i = 0;i<slotsq.length;i++){
        if(slotsq[i]["uid"] == uid){
          
          slotsq.pop(i);
        }
      }
      var updateSlot = {"$set":{"time_slots":slotsq}}
      dbo.collection("teacher").updateOne(query,updateSlot,function(e,r){

        return "Done"
      })


    });
})
}
const deleteFromTeacher = (id,uid)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"INS_ID":id}
    let stu = await dbo.collection("teacher").find(query,{sort: { title: 1 }})
   
    var slots = []
    await stu.forEach(e =>{
      slots = e["time_slots"]
    })
  
    let CMSID = "";
    for(i = 0;i<slots.length;i++){
      if(slots[i]["uid"] == uid){
        CMSID = slots[i]["CMSID"]
        slots.pop(i);
      }
    }
    var updateSlot = {"$set":{"time_slots":slots}}
    dbo.collection("teacher").updateOne(query,updateSlot,async function(e,r){

      var query1 = {"CMSID":CMSID};
      var tch = dbo.collection("student").find(query1,{sort: { title: 1 }})
      let slotsq = []
      await tch.forEach(e=>{
        slotsq = tch["time_slots"];
      })
      
      for(i = 0;i<slotsq.length;i++){
        if(slotsq[i]["uid"] == uid){
          
          slotsq.pop(i);
        }
      }
      var updateSlot = {"$set":{"time_slots":slotsq}}
      dbo.collection("student").updateOne(query,updateSlot,function(e,r){

        return "Done"
      })


    });
})
}
app.get("/delete-meeting/:type/:id/:uid",(req,res)=>{
  if(req.params.type == "teacher"){
    res.send(deleteFromTeacher(req.params.id,req.params.uid))
  }else{
    res.send(deleteFromStudent(req.params.id,req.params.uid))
  }
})
app.get("/teacher/get-slots/:INS_ID",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.INS_ID}}
    
    const teachs = dbo.collection("teacher").find(query,{sort: { title: 1 }});
    let r = [];
    await teachs.forEach(e =>{
      r = e["time_slots"]
    })
    res.send(r).status(200);
    db.close();
})
})
app.get("/student/get-slots/:CMSID",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.CMSID}}
    
    const teachs = dbo.collection("student").find(query,{sort: { title: 1 }});
    let r = [];
    await teachs.forEach(e =>{
      r = e["time_slots"]
    })
    res.send(r).status(200);
    db.close();
})
})
app.get("/student/get-friends/:CMSID",(req,res) => {
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.CMSID}}
    
    const teachs = dbo.collection("student").find(query,{sort: { title: 1 }});
    let r = [];
    await teachs.forEach(e =>{
      r = e["friends"]
    })
    res.send(r).status(200);
    db.close();
})
})
app.get("/teacher/get-friends/:INSID",(req,res) => {
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.INSID}}
    
    const teachs = dbo.collection("teacher").find(query,{sort: { title: 1 }});
    let r = [];
    await teachs.forEach(e =>{
      r = e["friends"]
    })
    res.send(r).status(200);
    db.close();
})
})
app.get("/teacher/accept-request/:INSID/:CMSID/:location",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.INSID}}
    dbo.collection("teacher").findOne(query, async function(err1,r){
      if(err1) res.send(err1.message).status(500)
      original_data = r
      requests = await r["requests"]
      friends = await r["friends"]
      student_id = req.params.CMSID

      for(i=0;i<requests.length;i++){
        if(requests[i]["CMSID"] == student_id){
          requests[i]["location"] = req.params.location.replaceAll(" ","-"); 
          friends.push(requests[i])
          requests.slice(i,i)
        }
      }
      original_data["requests"] = requests
      original_data["friends"] = friends
      updatedVals = {$set:{"requests":requests,"friends":friends}}
      dbo.collection("teacher").updateOne(query,updatedVals, function(err23,r23){
        query = {"_id":{"$eq":req.params.CMSID}}
        teacher_id = req.params.INSID

        dbo.collection("student").findOne(query,async function(err3,r43){
          stu_request = await r43["requests"]
          stu_friends = await r43["friends"]
          for(i=0;i<stu_request.length;i++){
            if(stu_request[i]["INS_ID"] == teacher_id){
              requests[i]["location"] = req.params.location.replaceAll(" ","-"); 
              stu_friends.push(stu_request[i])
              stu_request.slice(i,i)
            }
          }
          updated_stu = {$set:{"requests":stu_request,"friends":stu_friends}}
            dbo.collection("student").updateOne(query,updated_stu,function(e9,r9){
              res.send("Accepted").status(200)
              db.close();
            })
        })   
      })     
    })   
  });
})
app.get("/teacher/reject-request/:INSID/:CMSID",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    let query = {"_id":{"$eq":req.params.INSID}}
    dbo.collection("teacher").findOne(query, async function(err1,r){
      if(err1) res.send(err1.message).status(500)
      original_data = r
      requests = await r["requests"]
      student_id = req.params.CMSID

      for(i=0;i<requests.length;i++){
        if(requests[i]["CMSID"] == student_id){
          requests.pop(i)
        }
      }
      original_data["requests"] = requests
      updatedVals = {$set:{"requests":requests}}
      dbo.collection("teacher").updateOne(query,updatedVals, function(err23,r23){
        query = {"_id":{"$eq":req.params.CMSID}}
        teacher_id = req.params.INSID

        dbo.collection("student").findOne(query,async function(err3,r43){
          stu_request = await r43["requests"]
          for(i=0;i<stu_request.length;i++){
            if(stu_request[i]["INS_ID"] == teacher_id){
              stu_request.pop(i)
            }
          }
          updated_stu = {$set:{"requests":stu_request}}
            dbo.collection("student").updateOne(query,updated_stu,function(e9,r9){
              res.send("Rejected").status(200)
              db.close();
            })
        })   
      })     
    })   
  });
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
app.get("/updateSlot/:tp/:id/:dt/:tm",(req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var myquery = { "_id": {"$eq":req.params.id} };
    _t = await findTeacher(req.params.to);
    let t = {
      "INS_ID":_t["INS_ID"],
      "name":_t["NAME"].trim(),
      "date":req.params.date,
      "time":req.params.time,
      "location":""

    }
    var newvalues = { $push: {"requests":t} };
    dbo.collection("student").updateOne(myquery, newvalues, async function(err, re) {
      if (err) res.send(err.message).Status(500);
      
      
      const stu = await dbo.collection("student").findOne(myquery,{sort: { _id: 1 }})
        console.log(stu)
        var query1 = {"_id":{"$eq":req.params.to}}
        var obj = {
          "CMSID":req.params.id,
          "name":stu["name"],
          "date":req.params.date,
      "time":req.params.time,
      "location":""
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
app.get("/student/add-request/:id/:to/:date/:time", (req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var myquery = { "_id": {"$eq":req.params.id} };
    _t = await findTeacher(req.params.to);
    let t = {
      "INS_ID":_t["INS_ID"],
      "name":_t["NAME"].trim(),
      "date":req.params.date,
      "time":req.params.time,
      "location":""
    }
    var newvalues = { $push: {"requests":t} };
    dbo.collection("student").updateOne(myquery, newvalues, async function(err, re) {
      if (err) res.send(err.message).Status(500);
      const stu = await dbo.collection("student").findOne(myquery,{sort: { _id: 1 }})
        console.log(stu)
        var query1 = {"_id":{"$eq":req.params.to}}
        var obj = {
          "CMSID":req.params.id,
          "name":stu["name"],
          "date":req.params.date,
      "time":req.params.time,
      "location":""
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

app.get("/teacher/add-request/:id/:to/:date/:time", (req,res)=>{
  MongoClient.connect(url, async function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var myquery = { "_id": {"$eq":req.params.id} };
    _t = await findStudent(req.params.to);
    console.log(_t)
    let t = {
      "INS_ID":_t["CMSID"],
      "name":_t["NAME"].trim(),
      "date":req.params.date,
      "time":req.params.time,
      "location":""

    }
    var newvalues = { $push: {"requests":t} };
    dbo.collection("teacher").updateOne(myquery, newvalues, async function(err, re) {
      if (err) res.send(err.message).Status(500);
      
      
      const stu = await dbo.collection("teacher").findOne(myquery,{sort: { _id: 1 }})
        console.log(stu)
        var query1 = {"_id":{"$eq":req.params.to}}
        var obj = {
          "INS_ID":req.params.id,
          "name":stu["name"],
          "date":req.params.date,
      "time":req.params.time,
      "location":""
        }
        var newValue1 = {$push:{"requests":obj}}
        dbo.collection("student").updateOne(query1,newValue1,function(err,r){
          if(err) res.send(err.message).Status(500);
          res.send("Updated").status(200)
          db.close();
        })
    });
  });
})

app.get("/update-meeting/:tch/:stu/:dt/:tm/:lc",function(req,res){
  res.send("Success").status(200)
})
app.post("/api/send-message/:senderType/:from/:to",(req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var query = { "_id": {"$eq":req.params.from} };
    const senderType = req.params.senderType;
    let message = {
      "from":req.params.from,
      "to":req.params.to,
      "message":req.body.message,
      "timestamp":new Date().toLocaleString()
    }
    var newvalues = { $push:{"messages":message }};
    if(senderType == "teacher"){
      dbo.collection("teacher").updateOne(query, newvalues, function(err, re) {
        if (err) res.sendStatus(500); 
        let q ={"_id":{"$eq":req.params.to}}
        dbo.collection("student").updateOne(q,newvalues,function(e,r){
          res.send("Sent").status(200)        
        })
      });
    }else{
      dbo.collection("student").updateOne(query, newvalues, function(err, re) {
        if (err) res.sendStatus(500); 
        let q ={"_id":{"$eq":req.params.to}}
        dbo.collection("teacher").updateOne(q,newvalues,function(e,r){
          res.send("Sent").status(200)         
        })
      });
    }
  });
})
const filterChat = (arr,from,to)=>{
  fil = []
  for(i =0;i<arr.length;i++){
    if((arr[i]["from"] == from && arr[i]["to"] == to)||(arr[i]["from"] == to && arr[i]["to"] == from)){
      fil.push(arr[i])
    }
  }
  return fil
}
app.get("/get-chat/:type/:from/:to",(req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
    var query = { "_id": {"$eq":req.params.from} };
    const senderType = req.params.type;
    if(senderType == "teacher"){
      dbo.collection("teacher").findOne(query,async (err,result)=>{
        if(err) res.sendStatus(500);
        let chats = await result["messages"];
        chats = filterChat(chats,req.params.from,req.params.to);
        res.send(chats).status(200); 
        db.close();
      });
    }
    else{
      dbo.collection("student").findOne(query,async (err,result)=>{
        if(err) res.sendStatus(500);
        let chats = await result["messages"];
        chats = filterChat(chats,req.params.to,req.params.from);
        res.send(chats).status(200);      
        db.close();
      });
    }
   
  });
})
app.post("/student/:id",async (req,res)=>{
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("Students");
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
app.get("/updateData",async (req,res)=>{
  await clearData()
  await LoadStudents()
  await LoadTeachers()
  res.send("Students and Teachers are Updated Successfully")
})



app.get('/',async (req, res) => {
  if(STUDENTS.length == 0){
    await LoadStudents()
  }
  if(TEACHERS.length == 0){
    await LoadTeachers()
  }
  res.send('API FOR STCOM')
})
app.listen(port, async () => {
  await LoadStudents();
  await LoadTeachers(); 
  console.log(`API Listening at  http://localhost:${port}`)
})




