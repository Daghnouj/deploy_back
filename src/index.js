const express = require("express");
const connectDB = require("../config/db");
require("dotenv").config();
const session = require("express-session");
const path = require('path');
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { initSocket, getReceiverSocketId } = require("../socket/socket");

const passport = require("../config/passport");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const MongoStore = require('connect-mongo');

const app = express();
const server = http.createServer(app);

// Connexion à la base de données
connectDB();

// Middleware CORS - Solution complète pour les erreurs CORS
const allowedOrigins = [
  "http://localhost:3000", 
  "http://localhost:5173",
  "https://golden-torte-33b446.netlify.app" // Ajout du domaine Netlify
];

// Configuration CORS étendue
app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme les apps mobiles)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Gestion explicite des requêtes OPTIONS (pré-vol)
app.options('*', cors());

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
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Initialisation de Passport pour l'authentification
app.use(passport.initialize());
app.use(passport.session());

// Middleware JSON pour gérer les requêtes JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static("uploads"));

// Configuration WebSocket
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
    allowEIO3: true 
  }
});

// Initialisation Socket.IO
initSocket(io);
getReceiverSocketId(io);

// Attacher Socket.io aux requêtes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Importation des routes
const routes = {
  auth: require("../routes/authRoutes"),
  admin: require("../routes/adminRoutes"),
  password: require("../routes/passwordRoutes"),
  user: require("../routes/userRoutes"),
  galerie: require("../routes/galerieRoutes"),
  socialAuth: require("../routes/socialAuthRoutes"),
  partenaire: require("../routes/partenaireRoutes"),
  post: require("../routes/postRoutes"),
  booking: require("../routes/bookingRoutes"),
  notification: require("../routes/notificationRoutes"),
  subscription: require("../routes/subscriptionRoutes"),
  availability: require("../routes/availabilityRoutes"),
  contact: require("../routes/contactRoutes"),
  message: require("../routes/messageRoutes"),
  professional: require("../routes/professionalRoutes"),
  maps: require("../routes/MapsRouter"),
  chat: require("../routes/chatRoutes"),
  event: require("../routes/eventRoutes"),
}; 

// Définition des routes
app.use("/api/auth", routes.auth);
app.use("/api/admin", routes.admin);
app.use("/api/password", routes.password);
app.use("/api/user", routes.user);
app.use("/api/galerie", routes.galerie);
app.use("/api/partenaires", routes.partenaire);
app.use("/api/posts", routes.post);
app.use("/api/booking", routes.booking);
app.use("/api/availability", routes.availability);
app.use("/api/notifications", routes.notification); 
app.use("/api/subscriptions", routes.subscription);
app.use("/api/contact", routes.contact);
app.use("/api/messages", routes.message);
app.use("/api/professionals", routes.professional);
app.use("/api/maps", routes.maps);
app.use("/api/chat", routes.chat);
app.use("/api/events", routes.event);

// Routes d'authentification OAuth
app.get("/auth/google", passport.authenticate("google", { scope: ['profile', 'email'], session: false }));
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));

// Middleware pour déterminer dynamiquement l'URL de redirection
const getRedirectUrl = (req) => {
  const frontendBaseUrl = req.get('Referer') 
    ? new URL(req.get('Referer')).origin 
    : allowedOrigins[0];
  return `${frontendBaseUrl}/oauth-redirect`;
};

app.get("/auth/google/callback", 
  passport.authenticate("google", { 
    session: false,
    failureRedirect: "/login-failure"
  }),
  (req, res) => {
    const redirectUrl = `${getRedirectUrl(req)}?token=${req.user.token}&role=${req.user.role}`;
    res.redirect(redirectUrl);
  }
);

app.get("/auth/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/login-failure" }),
  (req, res) => {
    const redirectUrl = `${getRedirectUrl(req)}?token=${req.user.token}&role=${req.user.role}`;
    res.redirect(redirectUrl);
  }
);

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Gestion spécifique des erreurs CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Accès interdit par la politique CORS',
      allowedOrigins,
      attemptedOrigin: req.headers.origin
    });
  }
  
  res.status(500).send('Erreur serveur');
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`Origines autorisées : ${allowedOrigins.join(', ')}`);
});