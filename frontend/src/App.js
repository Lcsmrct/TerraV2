import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        minecraft_username: username
      });
      
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="modern-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🎮 MonCraft Server
        </Link>
        <div className="nav-links">
          <Link to="/" className="modern-button btn-secondary">Accueil</Link>
          {user ? (
            <>
              <Link to="/profile" className="modern-button btn-secondary">
                {user.skin_url && (
                  <img 
                    src={user.skin_url} 
                    alt="Skin" 
                    className="w-6 h-6 rounded-sm mr-2 inline-block"
                  />
                )}
                {user.minecraft_username}
              </Link>
              {user.is_admin && (
                <Link to="/admin" className="modern-button btn-admin">
                  👑 Admin
                </Link>
              )}
              <button onClick={logout} className="modern-button btn-danger">
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="modern-button btn-primary">Connexion</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const Home = () => {
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchServerStatus = async () => {
    try {
      const response = await axios.get(`${API}/server/status`);
      setServerStatus(response.data);
    } catch (error) {
      console.error('Error fetching server status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content fade-in-up">
          <h1>Bienvenue sur MonCraft</h1>
          <p>
            Rejoignez notre communauté de joueurs passionnés et découvrez un monde d'aventures sans limites
          </p>
          
          {/* Server Status */}
          <div className="modern-card mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center">
              📊 État du Serveur
            </h2>
            {loading ? (
              <div className="text-center">
                <div className="modern-loader mb-4"></div>
                <p className="text-secondary">Chargement des données...</p>
              </div>
            ) : serverStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.players_online}</div>
                  <div className="stat-label">Joueurs connectés</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.max_players}</div>
                  <div className="stat-label">Capacité max</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.latency?.toFixed(0) || 0}ms</div>
                  <div className="stat-label">Latence</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number status-online">
                    {serverStatus.players_online >= 0 ? "🟢" : "🔴"}
                  </div>
                  <div className="stat-label">Statut serveur</div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-error">❌ Impossible de se connecter au serveur</div>
              </div>
            )}
          </div>

          {/* Server Info */}
          <div className="modern-card">
            <h2 className="text-2xl font-bold mb-6 text-center">
              🌐 Informations de Connexion
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="info-item">
                <strong>Adresse IP:</strong>
                <span className="font-mono">91.197.6.209</span>
              </div>
              <div className="info-item">
                <strong>Port:</strong>
                <span className="font-mono">25598</span>
              </div>
              <div className="info-item">
                <strong>Version:</strong>
                <span>{serverStatus?.server_version || 'Chargement...'}</span>
              </div>
              <div className="info-item">
                <strong>Mode de jeu:</strong>
                <span>Survie Multijoueur</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="features-container">
          <h2 className="features-title">🎯 Pourquoi nous choisir ?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🌟</span>
              <h3>Communauté Active</h3>
              <p>Rejoignez des centaines de joueurs passionnés dans un environnement convivial et sécurisé.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🏗️</span>
              <h3>Constructions Épiques</h3>
              <p>Créez des œuvres d'art architecturales et partagez-les avec la communauté.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">⚔️</span>
              <h3>Aventures PvE</h3>
              <p>Explorez des donjons personnalisés et affrontez des défis uniques.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🛡️</span>
              <h3>Sécurité Garantie</h3>
              <p>Serveur protégé contre le grief avec système de sauvegarde automatique.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🎪</span>
              <h3>Événements Réguliers</h3>
              <p>Participez à des concours et événements spéciaux avec des récompenses exclusives.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">💬</span>
              <h3>Support 24/7</h3>
              <p>Notre équipe de modérateurs est disponible pour vous aider à tout moment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username);
    if (result.success) {
      // Redirect will happen automatically via AuthProvider
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="modern-card max-w-md w-full fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">🔐 Connexion</h2>
          <p className="text-secondary">Connectez-vous avec votre nom d'utilisateur Minecraft</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary">
              Nom d'utilisateur Minecraft
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="modern-input"
              placeholder="Ex: Steve, Alex, Notch..."
              required
            />
            <p className="text-xs text-secondary mt-2">
              Utilisez votre nom d'utilisateur Minecraft officiel
            </p>
          </div>
          
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="modern-button btn-primary w-full"
          >
            {loading ? (
              <>
                <div className="modern-loader" style={{width: '16px', height: '16px'}}></div>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-secondary">
            Nouveau sur notre serveur ? La connexion créera automatiquement votre compte.
          </p>
        </div>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen py-12">
      <div className="profile-container">
        <div className="modern-card fade-in-up">
          <div className="profile-header">
            <h2 className="text-3xl font-bold mb-6">👤 Mon Profil</h2>
            
            <div className="flex flex-col items-center">
              {user.skin_url ? (
                <img 
                  src={user.skin_url} 
                  alt="Skin Minecraft" 
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar bg-gray-600 flex items-center justify-center">
                  <span className="text-4xl">👤</span>
                </div>
              )}
              
              <h3 className="text-2xl font-semibold mt-4">{user.minecraft_username}</h3>
              <p className="text-secondary">
                {user.is_admin ? '👑 Administrateur' : '🎮 Joueur'}
              </p>
            </div>
          </div>
          
          <div className="profile-info">
            <div className="info-item">
              <strong>Nom d'utilisateur:</strong>
              <span>{user.minecraft_username}</span>
            </div>
            <div className="info-item">
              <strong>UUID Minecraft:</strong>
              <span className="font-mono text-sm">{user.uuid}</span>
            </div>
            <div className="info-item">
              <strong>Statut:</strong>
              <span className={user.is_admin ? 'text-cyan-400' : 'text-blue-400'}>
                {user.is_admin ? '👑 Administrateur' : '🎮 Joueur'}
              </span>
            </div>
            <div className="info-item">
              <strong>Membre depuis:</strong>
              <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {user.last_login && (
              <div className="info-item">
                <strong>Dernière connexion:</strong>
                <span>{new Date(user.last_login).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/users`)
      ]);
      setStats(statsResponse.data);
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId) => {
    try {
      await axios.put(`${API}/users/${userId}/admin`);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error toggling admin:', error);
    }
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        fetchAdminData(); // Refresh data
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  if (!user?.is_admin) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="modern-loader mb-4"></div>
          <p className="text-secondary">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        <div className="admin-header">
          <h2 className="admin-title">👑 Tableau de Bord Admin</h2>
          <p className="text-secondary">Gérez votre serveur et votre communauté</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.total_users}</div>
              <div className="stat-label">Utilisateurs totaux</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.admin_users}</div>
              <div className="stat-label">Administrateurs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.server_status.players_online}</div>
              <div className="stat-label">Joueurs connectés</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.server_status.latency?.toFixed(0) || 0}ms</div>
              <div className="stat-label">Latence serveur</div>
            </div>
          </div>
        )}

        {/* Users Management */}
        <div className="admin-section">
          <div className="modern-card">
            <h3 className="text-2xl font-semibold mb-6">👥 Gestion des Utilisateurs</h3>
            <div className="modern-table">
              <table>
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>UUID</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userData) => (
                    <tr key={userData.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {userData.skin_url && (
                            <img 
                              src={userData.skin_url} 
                              alt="Skin" 
                              className="w-8 h-8 rounded-lg"
                            />
                          )}
                          <span className="font-semibold">{userData.minecraft_username}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-sm">{userData.uuid?.substring(0, 8)}...</span>
                      </td>
                      <td>
                        <span className={userData.is_admin ? 'text-cyan-400' : 'text-blue-400'}>
                          {userData.is_admin ? '👑 Admin' : '🎮 Joueur'}
                        </span>
                      </td>
                      <td>
                        {new Date(userData.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleAdmin(userData.id)}
                            className="modern-button btn-secondary text-sm"
                          >
                            {userData.is_admin ? 'Retirer admin' : 'Promouvoir admin'}
                          </button>
                          {userData.id !== user.id && (
                            <button
                              onClick={() => deleteUser(userData.id)}
                              className="modern-button btn-danger text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;