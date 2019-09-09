var bodyParser = require("body-parser"),
methodOverride = require("method-override"),
expressSanitizer = require("express-sanitizer"),
mongoose       = require("mongoose"),
express        = require("express"),
app            = express();
passport = require("passport")
LocalStrategy = require("passport-local")
User = require("./models/user")
Blog = require("./models/blog")
Comment = require("./models/comment")
flash = require("connect-flash")
middleware = require("./middleware/index")

// APP CONFIG
mongoose.connect("mongodb://localhost/Blog_app",{ useNewUrlParser: true });
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));
app.use(flash())

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "I am cool",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

// RESTFUL ROUTES

app.get("/", function(req, res){
   res.redirect("/blogs"); 
});

// INDEX ROUTE
app.get("/blogs", function(req, res){
   Blog.find({}, function(err, blogs){
       if(err){
           console.log("ERROR!");
       } else {
          res.render("./blog/index", {blogs: blogs}); 
       }
   });
});
app.get("/blogs/myblogs/:userid", function(req, res){
    User.findById(req.user._id).populate("blogs").exec(function(err, user){
        if(err){
            console.log(err)
        }
        else{
            console.log(user)
            res.render("./blog/myblog", {user: user})
        }
    })
})
// NEW ROUTE
app.get("/blogs/new",middleware.isLoggedIn, function(req, res){
    res.render("./blog/new");
});

// CREATE ROUTE
app.post("/blogs",middleware.isLoggedIn, function(req, res){
    // create blog
    Blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("./blog/new");
        } else {
            newBlog.author.id = req.user._id
            newBlog.author.username = req.user.username
            newBlog.save()
            User.findById(req.user._id, function(err, user){
                if(err){
                    console.log(err)
                }
                else{
                    user.blogs.push(newBlog)
                    user.save()
                    res.redirect("/blogs");
                }
            })
            //then, redirect to the index
        }
    });
});

// SHOW ROUTE
app.get("/blogs/:id",middleware.isLoggedIn, function(req, res){
   Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog){
       if(err){
           res.redirect("/blogs");
       } else {
           res.render("./blog/show", {blog: foundBlog});
       }
   })
});

// EDIT ROUTE
app.get("/blogs/:id/edit",middleware.checkBlogOwnership, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        } else {
            res.render("./blog/edit", {blog: foundBlog});
        }
    });
})


// UPDATE ROUTE
app.put("/blogs/:id",middleware.checkBlogOwnership, function(req, res){
    req.body.blog.body = req.sanitize(req.body.blog.body)
   Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
      if(err){
          res.redirect("/blogs");
      }  else {
          res.redirect("/blogs/" + req.params.id);
      }
   });
});

// DELETE ROUTE
app.delete("/blogs/:id",middleware.checkBlogOwnership, function(req, res){
   //destroy blog
   Blog.findByIdAndRemove(req.params.id, function(err){
       if(err){
           res.redirect("/blogs");
       } else {
           res.redirect("/blogs");
       }
   })
   //redirect somewhere
});
app.get("/blogs/:id/comments/new",middleware.isLoggedIn, function(req, res){
    res.render("./comment/new",{blogid: req.params.id})
})
app.post("/blogs/:id/comments",middleware.isLoggedIn, function(req, res){
    Blog.findById(req.params.id, function(err, blog){
        if(err){
            console.log(err);
            res.redirect("/blogs");
        } else {
         Comment.create(req.body.comment, function(err, comment){
            if(err){
                req.flash("error", "Something went wrong");
                console.log(err);
            } else {
                //add username and id to comment
                comment.author.id = req.user._id;
                comment.author.username = req.user.username;
                //save comment
                comment.save();
                blog.comments.push(comment);
                blog.save();
                req.flash("success", "Successfully added comment");
                res.redirect('/blogs/' + req.params.id);
            }
         });
        }
    });
})
app.get("/blogs/:id/comments/:commentid/edit",middleware.checkCommentOwnership,function(req, res){
    Comment.findById(req.params.commentid, function(err, foundComment){
        if(err){
            console.log(err)
        }
        else{
            res.render("./comment/edit", {blogid: req.params.id, comment:foundComment})
        }
    })
})
app.put("/blogs/:id/comments/:commentid",middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.commentid, req.body.comment, function(err, editedComment){
        if(err){
            console.log(err)
        }
        else{
            res.redirect("/blogs/"+ req.params.id)
        }
    })
})
app.delete("/blogs/:id/comments/:commentid",middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.commentid, function(err, deletedComment){
        if(err){
            console.log(err)
        }
        else{
            req.flash("success", "deleted comment")
            res.redirect("/blogs/"+ req.params.id)
        }
    })
})
app.get("/users/myprofile/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log(err)
        }
        else{
            Blog.find().where("author.id").equals(foundUser._id).exec(function(err, foundBlogs){
                if(err){
                    console.log(err)
                }
                else{
                    res.render("./users/show", {user:foundUser, blogs:foundBlogs})
                }
            })
        }
    })
})
app.get("/results", function(req, res){
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Blog.find({title: regex}, function(err, foundBlogs){
            if(err){
                console.log(err)
            }
            else{
                res.render("blog/foundBlogs", {blogs:foundBlogs})
            }
        })
    }
})

app.get("/register", function(req, res){
    res.render("register")
})
app.post("/register", function(req, res){
    var newUser = new User({
        username: req.body.username,
        firstname: req.body.firstname,
        lastname:req.body.lastname, 
        sex: req.body.sex, 
        email: req.body.email, 
        avatar: req.body.avatar})
    User.register(newUser, req.body.password, function(err, newUser){
        if(err){
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Welcome to Blog site " + newUser.username);
           res.redirect("/blogs"); 
        });
    });
})
app.get("/login",function(req, res){
    res.render("login")
})
app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
  }),
  (req, res) => {
    req.flash('success', 'You\'ve successfully logged in!');
    res.redirect('/blogs');
  }
);
app.get("/logout", function(req, res){
    req.logout()
    req.flash("success", "Logged you out!");
    res.redirect("/blogs");
})

app.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log(err)
        }
        else{
            Blog.find().where("author.id").equals(foundUser._id).exec(function(err, foundBlogs){
                if(err){
                    console.log(err)
                }
                else{
                    res.render("./users/show", {user:foundUser, blogs:foundBlogs})
                }
            })
        }
    })
})
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("SERVER IS RUNNING!");
})
