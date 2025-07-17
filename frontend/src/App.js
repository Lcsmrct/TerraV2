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
    <nav className="minecraft-nav">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold minecraft-text">
          🎮 MonCraft Server
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/" className="minecraft-button">Accueil</Link>
          {user ? (
            <>
              <Link to="/profile" className="minecraft-button">
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
                <Link to="/admin" className="minecraft-button admin-button">
                  Admin
                </Link>
              )}
              <button onClick={logout} className="minecraft-button logout-button">
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="minecraft-button">Connexion</Link>
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
        <div className="hero-content">
          <h1 className="text-6xl font-bold mb-4 minecraft-text">
            Bienvenue sur MonCraft
          </h1>
          <p className="text-xl mb-8 text-gray-200">
            Rejoignez notre communauté Minecraft et vivez des aventures épiques !
          </p>
          
          {/* Server Status */}
          <div className="minecraft-panel mb-8">
            <h2 className="text-2xl font-bold mb-4 minecraft-text">
              📊 État du Serveur
            </h2>
            {loading ? (
              <div className="text-center">
                <div className="minecraft-loader"></div>
                <p>Chargement...</p>
              </div>
            ) : serverStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.players_online}</div>
                  <div className="stat-label">Joueurs en ligne</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.max_players}</div>
                  <div className="stat-label">Joueurs max</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{serverStatus.latency?.toFixed(0) || 0}ms</div>
                  <div className="stat-label">Latence</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number status-indicator">
                    {serverStatus.players_online >= 0 ? "🟢" : "🔴"}
                  </div>
                  <div className="stat-label">Statut</div>
                </div>
              </div>
            ) : (
              <p className="text-red-400">Impossible de se connecter au serveur</p>
            )}
          </div>

          {/* Server Info */}
          <div className="minecraft-panel">
            <h2 className="text-2xl font-bold mb-4 minecraft-text">
              🌐 Informations du Serveur
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="info-card">
                <strong>IP:</strong> 91.197.6.209
              </div>
              <div className="info-card">
                <strong>Port:</strong> 25598
              </div>
              <div className="info-card">
                <strong>Version:</strong> {serverStatus?.server_version || 'Chargement...'}
              </div>
              <div className="info-card">
                <strong>Type:</strong> Survie
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12 minecraft-text">
            🎯 Fonctionnalités
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3 className="text-xl font-bold mb-2">Communauté Active</h3>
              <p>Rejoignez des joueurs passionnés et participez à des événements réguliers.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏗️</div>
              <h3 className="text-xl font-bold mb-2">Constructions Épiques</h3>
              <p>Créez des constructions incroyables et partagez-les avec la communauté.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚔️</div>
              <h3 className="text-xl font-bold mb-2">Aventures PvE</h3>
              <p>Explorez des donjons personnalisés et affrontez des boss uniques.</p>
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
    <div className="min-h-screen flex items-center justify-center bg-minecraft-dark">
      <div className="minecraft-panel max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center minecraft-text">
          🔐 Connexion
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nom d'utilisateur Minecraft
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="minecraft-input"
              placeholder="Entrez votre nom Minecraft"
              required
            />
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="minecraft-button w-full"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="text-center text-gray-400 mt-4 text-sm">
          Utilisez votre nom d'utilisateur Minecraft pour vous connecter
        </p>
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-minecraft-dark py-8">
      <div className="container mx-auto px-4">
        <div className="minecraft-panel max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 minecraft-text">
            👤 Mon Profil
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="profile-avatar">
              {user.skin_url ? (
                <img 
                  src={user.skin_url} 
                  alt="Skin Minecraft" 
                  className="w-32 h-32 rounded-lg mx-auto"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-600 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-4xl">👤</span>
                </div>
              )}
            </div>
            
            <div className="profile-info">
              <div className="info-item">
                <strong>Nom d'utilisateur:</strong>
                <span>{user.minecraft_username}</span>
              </div>
              <div className="info-item">
                <strong>UUID:</strong>
                <span className="text-sm font-mono">{user.uuid}</span>
              </div>
              <div className="info-item">
                <strong>Statut:</strong>
                <span className={user.is_admin ? 'text-yellow-400' : 'text-green-400'}>
                  {user.is_admin ? '👑 Administrateur' : '🎮 Joueur'}
                </span>
              </div>
              <div className="info-item">
                <strong>Membre depuis:</strong>
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              {user.last_login && (
                <div className="info-item">
                  <strong>Dernière connexion:</strong>
                  <span>{new Date(user.last_login).toLocaleDateString()}</span>
                </div>
              )}
            </div>
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
      <div className="min-h-screen bg-minecraft-dark flex items-center justify-center">
        <div className="minecraft-loader"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-minecraft-dark py-8">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-8 minecraft-text">
          👑 Panneau d'Administration
        </h2>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <div className="stat-label">Joueurs en ligne</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.server_status.latency?.toFixed(0) || 0}ms</div>
              <div className="stat-label">Latence serveur</div>
            </div>
          </div>
        )}

        {/* Users Management */}
        <div className="minecraft-panel">
          <h3 className="text-2xl font-bold mb-4 minecraft-text">
            👥 Gestion des Utilisateurs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-3">Utilisateur</th>
                  <th className="text-left p-3">UUID</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Inscription</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userData) => (
                  <tr key={userData.id} className="border-b border-gray-700">
                    <td className="p-3">
                      <div className="flex items-center">
                        {userData.skin_url && (
                          <img 
                            src={userData.skin_url} 
                            alt="Skin" 
                            className="w-8 h-8 rounded-sm mr-3"
                          />
                        )}
                        {userData.minecraft_username}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-mono">{userData.uuid?.substring(0, 8)}...</span>
                    </td>
                    <td className="p-3">
                      <span className={userData.is_admin ? 'text-yellow-400' : 'text-green-400'}>
                        {userData.is_admin ? '👑 Admin' : '🎮 Joueur'}
                      </span>
                    </td>
                    <td className="p-3">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleAdmin(userData.id)}
                          className="minecraft-button text-sm"
                        >
                          {userData.is_admin ? 'Retirer admin' : 'Faire admin'}
                        </button>
                        {userData.id !== user.id && (
                          <button
                            onClick={() => deleteUser(userData.id)}
                            className="minecraft-button text-sm bg-red-600 hover:bg-red-700"
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