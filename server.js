const express = require('express');
const session = require('express-session')
let mongo = require('mongodb');
const pug = require('pug');
const fs = require('fs');

const movies = require("./data/movie-data-2500.json");
const users = require("./data/user-data.json");
const { response } = require('express');

// console.log(movies);

let app = express();
let MongoClient = mongo.MongoClient;
let db;


app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    session({
      secret: "some secret key here",
      resave: true, // saves session after every request
      saveUninitialized: false, // stores the session if it hasn't been stored
    })
  );
app.get('/',(request,response)=>{
    response.status(200).render('start',{session:request.session})
    // response.status(400).send("sort")
})
app.get('/searchMovie', (request,response)=>{
    response.redirect('/searchPage')
    // response.status(400).send("search")
});
app.get('/searchPage',(request,response)=>{
    response.status(200).render('searchPage',{session:request.session})
})
app.get('/login',(request,response)=>{
    // response.status(200).render('login')
    if(request.session.loggedin){
        response.status(200).send("you are already logged in");
    }
    else{
        response.status(200);
        response.sendFile(__dirname+'/public/signIn.html')
    }
})
app.get('/register',(request,response)=>{
    if(request.session.loggedin){
        response.status(200).send("you are already logged in, cannot sign up unless you are logged out");
    }
    else{
        response.status(200);
        response.sendFile(__dirname+'/public/signUp.html')
    }
})
app.get('/movies/:movieID/addReview',auth,(request,response)=>{
    let oid;
    try{
		oid = new mongo.ObjectID(request.params.movieID);
	}catch{
		response.status(404).send("Unknown ID");
		return;
	}
    db.collection("movies").findOne({"_id":oid}, function(err, result){
		if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown ID");
			return;
		}
        // console.log(result.Title)
        request.session.currentMovie = result.Title
        // console.log(request.session)
        // console.log(result.Rated);
        db.collection("movies").find({Rated:result.Rated}).limit(2).toArray((error,res)=>{
            if(err){
                response.status(500).send("Error reading database.")
            }
            response.status(200).render("addReview", {movie:result,recommands:res,session:request.session});
        //    console.log(res)
        });
		// response.status(200).render("movie", {movie:result});
	});
})
app.get('/logout',auth,logout);
app.get('/profile/:username',auth,(request,response)=>{
    db.collection("users").findOne({"name":request.params.username}, function(err, result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown username");
			return;
		}
        // console.log(result);
        response.status(200).render("profile", {user:result,session:request.session});
    })
})
app.get('/profile/:username/addMovie',auth,(request,response)=>{
    db.collection("users").findOne({"name":request.session.username}, function(err, result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown username");
			return;
		}
        response.status(200).render("addMovie", {user:result,session:request.session});
    })
})
app.get('/search',searchMovies);
app.get('/movies/:movieID',sendOneMovie);
app.get('/movies',getMovies)
app.get('/movies2/:movieTitle',(request,response)=>{
    // console.log(request.params.movieTitle)
    db.collection("movies").findOne({"Title":request.params.movieTitle}, function(err, result){
		if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown Title");
			return;
		}
        else{
            request.session.currentMovie = result.Title
            db.collection("movies").find({Rated:result.Rated}).limit(3).toArray((err,res)=>{
                if(err){
                    response.status(500).send("Error reading database.")
                }
                response.status(200).render("movie", {movie:result,recommands:res,session:request.session});
            });
        }
        // console.log(result.Title)
        // request.session.currentMovie = result.Title
        // db.collection("movies").find({Rated:result.Rated}).limit(3).toArray((err,res)=>{
        //     if(err){
        //         response.status(500).send("Error reading database.")
        //     }
        //     response.status(200).render("movie", {movie:result,recommands:res,session:request.session});
        // });
	});
})
app.get('/other/:userName',auth,(request,response)=>{
    db.collection("users").findOne({name:request.params.userName}, function(err, result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown User");
			return;
		}
        else{
            request.session.currViewUser = result.name;
            console.log(request.session)
            // console.log(result.name)
            response.status(200).render('other',{user:result,session:request.session})

        }
    })
    // response.status(200).render('other',{user:result,session:request.session})
})
app.get('/searchUser',searchUser)
app.post('/upgrade',upgradeAccount)
app.post('/downgrade',downgradeAccount)
app.post('/addMovie',addMovie)
app.post('/addReview',addReview)
app.post('/login',(request,response)=>{
    // console.log(request.body)
    db.collection("users").findOne({name:request.body.name,password:request.body.password},function(err,result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
        if(!result){
            response.status(404).send("wrong password or username")
        }
        else{
            request.session.loggedin = true;
            request.session.username = request.body.name;
            console.log(request.session)
            response.status(200).redirect(`/profile/${result.name}`)
        }
        // request.session.loggedin = true;
        // request.session.username = request.body.name;
        // console.log(request.session)
        // // console.log(result._id)
        // response.status(200).redirect(`/profile/${result.name}`)
    })
})
app.post('/register',(request,response)=>{
    // console.log(request.body.name)
    db.collection("users").find({name:request.body.name}).toArray(function(err,result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
        // console.log(result)
        if(result.length<1){
            let newuser =request.body;
            newuser.accountType=0;
            newuser.subscriptions = [];
            newuser.followers = [];
            newuser.watchList = [];
            newuser.notifications = [];
            newuser.recommandations = [];
            newuser.review = [];
            console.log(newuser)
            
            // newuser.push({"name":request.body.name, "password":request.body.password, 'accountType':0, 'subscriptions':[],'watchList':[],'notifications':[]})
            db.collection("users").insertOne(newuser,function(err,result){
                if(err) throw err;
                else{
                    console.log("new user is added");
                    response.status(200).redirect('/login')
                }
            })
        }
        else if(result[0].name === request.body.name){
            // response.status(300).send("you already registered");
            response.status(300).send("This name is taken already");
        }
        
    })
})
app.post('/removeWatchList',(request,response)=>{
    db.collection("users").updateOne({name:request.session.username},{'$pull':{watchList:request.session.currentMovie}},function(err,res){
        if(err){
            throw err;
        }
        else{
            console.log(`updated user:${request.session.username} 's watchlist`);
            response.status(200).redirect(`/profile/${request.session.username}`)
            // console.log(results);
        }
    })
})
app.post('/addWatchList',(request,response)=>{
    db.collection("users").updateOne({name:request.session.username},{'$push':{watchList:request.session.currentMovie}}, function(err,result){
        if(err){
            throw err;
        }
        else{
            response.status(200).redirect(`/profile/${request.session.username}`)
        }
    })

    // db.collection("users").findOne({"name":request.session.username}, function(err, result){
    //     if(err){
    //         throw err;
    //     }
        
    //         // db.collection("users").updateOne({name:request.session.username},{'$push':{watchList:request.session.currentMovie}}, function(err,res){
    //         //     if(err){
    //         //         throw err;
    //         //     }
    //         //     else{
    //         //         response.status(200).redirect(`/profile/${request.session.username}`)
    //         //         // console.log(results);
    //         //     }
    //         // })
    //         // console.log(result.watchList.length)
        
    //     if(result.watchList.length !=0){
    //         result.watchList.forEach(w=>{
    //         if(w === request.session.currentMovie){
    //             // console.log("you have added to the watch list")
    //             response.send("you have added to the watch list")
    //         }
    //         // else{
    //         //     db.collection("users").updateOne({name:request.session.username},{'$push':{watchList:request.session.currentMovie}}, function(err,result){
    //         //                 if(err){
    //         //                     throw err;
    //         //                 }
    //         //                 else{
    //         //                     response.status(200).redirect(`/profile/${request.session.username}`)
    //         //                     // console.log(results);
    //         //                 }
    //         //             })
    //         // }
    //     })}
    //     else{
    //         db.collection("users").updateOne({name:request.session.username},{'$push':{watchList:request.session.currentMovie}}, function(err,result){
    //             if(err){
    //                 throw err;
    //             }
    //             else{
    //                 response.status(200).redirect(`/profile/${request.session.username}`)
    //                 // console.log(results);
    //             }
    //         })
    //     }
        
        
    // });


})
app.post('/follow',(request,response)=>{
    db.collection("users").updateOne({name:request.session.username},{'$push':{subscriptions:request.session.currViewUser}}, function(err,result){
        if(err){
            throw err;
        }
        else{
            db.collection("users").updateOne({name:request.session.currViewUser},{'$push':{followers:request.session.username}}, function(err,res){
                if(err){
                    throw err;
                }
                console.log(`user: ${request.session.currViewUser}'s follower list is updated`)
            })
            console.log(request.session)
            response.status(200).redirect(`/profile/${request.session.username}`)
        }
    })
})
app.post('/unfollow',(request,response)=>{
    db.collection("users").updateOne({name:request.session.username},{'$pull':{subscriptions:request.session.currViewUser}},function(err,res){
        if(err){
            throw err;
        }
        else{
            console.log(`updated user:${request.session.username} 's following`);
            //request.session.upgrade = true;
            response.status(200).redirect(`/profile/${request.session.username}`)
            // console.log(results);
        }
    })
})
function auth(request,response,next){
    if(!request.session.loggedin){
        //response.status(401).send('Unauthorized, please log in first');
        response.status(200).redirect('/login')
        return;
    }
    next();
}
function logout(request,response){
    request.session.destroy();
    // console.log(request.session)
    response.redirect('/');
}
function getMovies(request,response){
    if (request.query.hasOwnProperty('genre') && request.query.genre.length!=0){
        var genre=request.query.genre;
        db.collection("movies").find({'Genre':genre}).toArray((error, results)=>{
			if (error){
				const message = 'Could not get movies.'
				console.error(message)
				response.status(500).send(message)
				return;
			}
			response.status(200).render("movies", {movies: results, session:request.session});
		})
    }
    else{
        db.collection("movies").find().toArray((error, results)=>{
			if (error){
				const message = 'Could not get movies.'
				console.error(message)
				response.status(500).send(message)
				return;
			}
			response.status(200).render("movies", {movies: results, session:request.session});
		})
    }
}
function sendOneMovie(request,response){
    // console.log(request.params)
    let oid;
    try{
		oid = new mongo.ObjectID(request.params.movieID);
	}catch{
		response.status(404).send("Unknown ID");
		return;
	}
    db.collection("movies").findOne({"_id":oid}, function(err, result){
		if(err){
			response.status(500).send("Error reading database.");
			return;
		}
		if(!result){
			response.status(404).send("Unknown ID");
			return;
		}
        // console.log(result.Title)
        request.session.currentMovie = result.Title
        request.session.currentMovieID = result._id

        // console.log(request.session)
        // console.log(result.Rated);
        db.collection("movies").find({Rated:result.Rated}).limit(2).toArray((error,res)=>{
            if(err){
                response.status(500).send("Error reading database.")
            }
            response.status(200).render("movie", {movie:result,recommands:res,session:request.session});
        //    console.log(res)
        });
		// response.status(200).render("movie", {movie:result});
	});
}
function addMovie(request,response){
    console.log("add")
    db.collection("movies").find({Title:request.body.Title}).toArray(function(err,result){
        if(err){
			response.status(500).send("Error reading database.");
			return;
		}
        // console.log(result)
        if(result.length<1){
            let newMovie = request.body;
            newMovie.review = [];
            console.log(newMovie)
            
            // newMovie.push({"name":request.body.name, "password":request.body.password, 'accountType':0, 'subscriptions':[],'watchList':[],'notifications':[]})
            db.collection("movies").insertOne(newMovie,function(err,result){
                if(err) throw err;
                else{
                    console.log("new movie is added");
                    response.status(200).redirect('/profile/:username/addMovie')
                }
            })
        }
        else if(result[0].Title === request.body.Title){
            // response.status(300).send("you already registered");
            response.status(300).send("This name is taken already");
        }
    })
}
function addReview(request,response){
    console.log("addR")
    let review =request.body;
    review.movieTitle = request.session.currentMovie;
    review.movieID = request.session.currentMovieID;
    review.writer = request.session.username;
    //console.log(review)
    db.collection("users").updateOne({name:request.session.username},{'$push':{review:review}}, function(err,result){
        db.collection("users").findOne({name:request.session.username}, function(err, result){
            console.log("users")
            console.log(result)
        })
        if(err){
            throw err;
        }
        else{
            db.collection("movies").updateOne({Title:request.session.currentMovie},{'$push':{review:review}}, function(err,result){
                db.collection("movies").findOne({Title:request.session.currentMovie}, function(err, result){
                    console.log("movies")
                    console.log(result)
                })
                if(err){
                    throw err;
                }
                else{
                    response.status(200).redirect(`/movies/${request.session.currentMovieID}/addReview`)
                }
            })
        }
    })
}
function downgradeAccount(request,response){
    if(request.session.upgrade){
        db.collection("users").updateOne({name:request.session.username},{'$set':{accountType:0}}, function(err,result){
            if(err){
                throw err;
            }
            else{
                console.log(`updated user:${request.session.username} 's account type`);
                request.session.upgrade = false;
                response.status(200).redirect(`/profile/${request.session.username}`)
                // console.log(results);
            }
        })
    }
    else{
        response.send("its normal account already")
    }
}
function upgradeAccount(request,response){
    // console.log(request.session.username)
    if(!request.session.upgrade){
        db.collection("users").updateOne({name:request.session.username},{'$set':{accountType:1}}, function(err,result){
            if(err){
                throw err;
            }
            else{
                console.log(`updated user:${request.session.username} 's account type`);
                request.session.upgrade = true;
                response.status(200).redirect(`/profile/${request.session.username}`)
                // console.log(results);
            }
        })
    }
    else{
        response.send("you have been upgraded")
    }
}
function searchResponse(request, response, error, results){
    if (error){
        const message = 'Could not get movies.'
        console.error(message)
        response.status(500).send(message)
        return
    }
    // console.log(results)
    response.status(200).render("movies", {movies: results, session:request.session});
}
//search movies in searchPage
function searchMovies(request,response){
     // console.log(request.query)
    // console.log(request.query.genre.length)
    var title;
    var genre;
    var actor;
    // response.status(401).send("request")
    //case 1
    // can search three fields(title, genre, actor) at the same time
    if(request.query.hasOwnProperty('actor') && request.query.actor.length!=0 && request.query.hasOwnProperty('title') && request.query.title.length!=0 && request.query.hasOwnProperty('genre') && request.query.genre.length!=0){
        actor=request.query.actor;
        title=request.query.title;
        genre=request.query.genre;
        db.collection("movies").find({Actors:actor, Genre:genre, Title:title}).toArray((error, results)=>{
            searchResponse(request, response, error, results)
		})
    }
    //case 2: title, genre
    else if(request.query.hasOwnProperty('title') && request.query.title.length!=0 && request.query.hasOwnProperty('genre') && request.query.genre.length!=0){
        title=request.query.title;
        genre=request.query.genre;
        db.collection("movies").find({Genre:genre, Title:title}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    //case 3: title, actor
    else if(request.query.hasOwnProperty('title') && request.query.title.length!=0 && request.query.hasOwnProperty('actor') && request.query.actor.length!=0){
        title=request.query.title;
        actor=request.query.actor;
        db.collection("movies").find({Actors:actor, Title:title}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    //case 4: genre,actor
    else if(request.query.hasOwnProperty('genre') && request.query.genre.length!=0 && request.query.hasOwnProperty('actor') && request.query.actor.length!=0){
        genre=request.query.genre;
        actor=request.query.actor;
        db.collection("movies").find({Actors:actor, 'Genre':genre}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    //case 5: genre
    else if(request.query.hasOwnProperty('genre') && request.query.genre.length!=0){
        genre=request.query.genre;
        db.collection("movies").find({'Genre':genre}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    //case 6: title
    else if(request.query.hasOwnProperty('title') && request.query.title.length!=0){
        title=request.query.title;
        db.collection("movies").find({Title:title}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    //case 7: actor
    else if(request.query.hasOwnProperty('actor') && request.query.actor.length!=0){
        actor=request.query.actor;
        db.collection("movies").find({Actors:actor}).toArray((error, results)=>{
			searchResponse(request, response, error, results)
		})
    }
    else{
        // console.log("empty search")
        response.send("empty search, please fill up at least one of the field");
    }

}
function searchUser(request,response){
    if(request.query.hasOwnProperty('searchUser') && request.query.searchUser.length!=0 && request.query.searchUser != request.session.username){
        db.collection("users").findOne({name:request.query.searchUser}, function(err, result){
            if(err){
                response.status(500).send("Error reading database.");
                return;
            }
            if(!result){
                response.send("Unknown user");
                return;
            }
            else{
                // response.status(200).render('other',{user:result,session:request.session})
                response.status(200).redirect(`/other/${result.name}`)
            }
            // console.log(result)
        });
    }
    else if(request.query.searchUser === request.session.username){
        response.send(`you are logged in as ${request.session.username}. You cannot search for yourself`)
    }
}
MongoClient.connect("mongodb://localhost:27017/", function(err, client){
    if(err) throw err;

    db = client.db('project');
    db.dropCollection('users',function(err,result){
        if(err){
            console.log("Error dropping collection. Likely case: collection did not exist (don't worry unless you get other errors...)")
        }
        else{
            console.log("Cleared users collection.");
        }
    })
    db.collection("users").insertMany(users,function(err,result){
        if(err) throw err;
        else{
            console.log("insert movies collection successfully")
            db.collection("users").updateMany({},{'$set':{"review":[]}}, function(err,results){
                if(err){
                    throw err;
                }
                else{
                    console.log("updated user collection")
                }
            });
        }
    })
    app.listen(3000);
    console.log("Listening on port 3000");
});