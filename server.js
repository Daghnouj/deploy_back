const express = require("express");
const connectDB = require("./config/db");
require("dotenv").config();
const session = require("express-session");
const path = require('path');
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { initSocket,getReceiverSocketId } = require("./socket/socket");

const passport = require("./config/passport");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const MongoStore = require('connect-mongo');


const app = express();
const server = http.createServer(app);

// Connexion à la base de données
connectDB();

// Middleware CORS - Autorisation de plusieurs origines (5173 et 3000)
const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
app.use(cors({
    origin: allowedOrigins, // Autoriser uniquement le frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Autoriser les méthodes HTTP
    allowedHeaders: ['Content-Type', 'Authorization'], // Autoriser les en-têtes
    credentials: true, // Autoriser les cookies et les en-têtes d'authentification]
  }));

// Page d'accueil
// app.get("/", (req, res) => {
//     res.sendFile(__dirname + "/public/subcription.html");
// });

// Gestion des sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, 
      mongoOptions: {
          useNewUrlParser: true,
          useUnifiedTopology: true
      }
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));
// Initialisation de Passport pour l'authentification
app.use(passport.initialize());
app.use(passport.session());

// Middleware JSON pour gérer les requêtes JSON
app.use(express.json());
// app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')));

// Importation des routes


// Configuration WebSocket
const io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"], // Ajouter Authorization
      credentials: true
    },
    transports: ['websocket', 'polling'], // Ajouter explicitement les transports
    pingTimeout: 60000, // Augmenter le timeout
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
      allowEIO3: true 
    }
  });
initSocket(io);
getReceiverSocketId(io);
// server.js
app.use((req, res, next) => {
    req.io = io; // Attacher l'instance Socket.io à la requête
    next();
  });

  const routes = {
    auth: require("./routes/authRoutes"),
    admin: require("./routes/adminRoutes"),
    password: require("./routes/passwordRoutes"),
    user: require("./routes/userRoutes"),
    galerie: require("./routes/galerieRoutes"),
    socialAuth: require("./routes/socialAuthRoutes"),
    partenaire: require("./routes/partenaireRoutes"),
    event: require("./routes/eventRoutes"),
    post: require("./routes/postRoutes"),
    booking: require("./routes/bookingRoutes"),
    notification: require("./routes/notificationRoutes"),
    subscription: require("./routes/subscriptionRoutes"),
    webhook: require("./routes/webhookRoutes"),
    availability: require("./routes/availabilityRoutes"),
    contact: require("./routes/contactRoutes"),
    message: require("./routes/messageRoutes"),
    professional: require("./routes/professionalRoutes"),
    maps: require("./routes/MapsRouter"),
  }; 

// Définition des routes
app.use("/api/auth", routes.auth);
app.use("/api/admin", routes.admin);
app.use("/api/password", routes.password);
app.use("/uploads", express.static("uploads"));
app.use("/api/user", routes.user);
app.use("/api/galerie", routes.galerie);
app.use("/api/partenaires", routes.partenaire);
app.use("/api/events", routes.event);
app.use("/api/posts", routes.post);
app.use("/api/booking", routes.booking);
app.use("/api/availability", routes.availability);
app.use("/api/notifications", routes.notification); 
app.use("/api/subscriptions", routes.subscription);
app.use("/api/webhook", routes.webhook);
app.use("/api/contact", routes.contact);
app.use("/api/messages", routes.message);
app.use("/api/professionals", routes.professional);
app.use("/api/maps", routes.maps);


// Routes d'authentification OAuth
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));

app.get("/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login-failure" }),
    (req, res) => {
        res.redirect(`http://localhost:5173/oauth-redirect?token=${req.user.token}&role=${req.user.role}`);
    }
);

app.get("/auth/facebook/callback",
    passport.authenticate("facebook", { session: false, failureRedirect: "/login-failure" }),
    (req, res) => {
        res.redirect(`http://localhost:5173/oauth-redirect?token=${req.user.token}&role=${req.user.role}`);
    }
);

app.post('/api/add-availability', async (req, res) => {
  const { summary, description, start, end } = req.body;

  try {
    const response = await insertEvent({ summary, description, start, end });
    res.status(200).json({ success: true, eventId: response.data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur lors de l’ajout de l’événement' });
  }
});
// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
