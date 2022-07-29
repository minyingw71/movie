const movies = require("./data/movie-data-2500.json");
const users = require("./data/user-data.json");
let mongo = require('mongodb');
let MongoClient = mongo.MongoClient;
let db;


MongoClient.connect("mongodb://localhost:27017/", function(err, client){
    if(err) throw err;
    
    db = client.db('project');

    db.dropCollection('movies',function(err,result){
        if(err){
            console.log("Error dropping collection. Likely case: collection did not exist (don't worry unless you get other errors...)")
        }
        else{
            console.log("Cleared movies collection.");
            // process.exit()
        }
        db.collection("movies").insertMany(movies, function(err, result){
            if(err) throw err;
            else{
                console.log("insert movies collection successfully")
            }
            db.collection("movies").updateMany({},{'$set':{"review":[]}}, function(err,results){
                if(err){
                    throw err;
                }
                else{
                    console.log("updated movies collection")
                    process.exit()

                }
            });
        });
    }) 
    // process.exit()
});