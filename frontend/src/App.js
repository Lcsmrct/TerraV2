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
          <Link to="/shop" className="modern-button btn-secondary">🛒 Boutique</Link>
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

const Shop = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/shop/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching shop items:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseItem = async (itemId) => {
    if (!user) {
      alert('Vous devez être connecté pour acheter');
      return;
    }

    try {
      const response = await axios.post(`${API}/shop/purchase/${itemId}`);
      alert('Achat initié avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'achat: ' + (error.response?.data?.detail || 'Erreur inconnue'));
    }
  };

  const categories = ['all', ...new Set(items.map(item => item.category))];
  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen py-12">
      <div className="container">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">🛒 Boutique</h1>
          <p className="text-secondary">Améliorez votre expérience de jeu avec nos articles premium</p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`modern-button ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
              >
                {category === 'all' ? 'Tous' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Shop Items */}
        {loading ? (
          <div className="text-center">
            <div className="modern-loader mb-4"></div>
            <p className="text-secondary">Chargement des articles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="modern-card">
                <div className="mb-4">
                  <img 
                    src={item.image_url} 
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                <p className="text-secondary mb-4">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-primary">{item.price}€</span>
                  <button
                    onClick={() => purchaseItem(item.id)}
                    className="modern-button btn-primary"
                    disabled={!user}
                  >
                    {user ? 'Acheter' : 'Connexion requise'}
                  </button>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-secondary">Catégorie: {item.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-secondary">Aucun article disponible dans cette catégorie.</p>
          </div>
        )}
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
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${API}/shop/purchases`);
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

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
              <strong>Connexions:</strong>
              <span>{user.login_count || 0} fois</span>
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

        {/* Purchase History */}
        <div className="modern-card mt-8">
          <h3 className="text-2xl font-bold mb-6">🛒 Historique des Achats</h3>
          {loading ? (
            <div className="text-center">
              <div className="modern-loader mb-4"></div>
              <p className="text-secondary">Chargement...</p>
            </div>
          ) : purchases.length > 0 ? (
            <div className="space-y-4">
              {purchases.map(purchase => (
                <div key={purchase.id} className="info-item">
                  <div>
                    <strong>{purchase.item_name}</strong>
                    <p className="text-sm text-secondary">
                      {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{purchase.price}€</div>
                    <div className={`text-sm ${purchase.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {purchase.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-secondary">Aucun achat pour le moment</p>
          )}
        </div>
      </div>
    </div>
  );
};

const Admin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState(null);
  const [serverLogs, setServerLogs] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (user?.is_admin) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsResponse, usersResponse, activityResponse, logsResponse, purchasesResponse] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/users`),
        axios.get(`${API}/admin/users/activity`),
        axios.get(`${API}/admin/server/logs`),
        axios.get(`${API}/admin/shop/purchases`)
      ]);
      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setActivity(activityResponse.data);
      setServerLogs(logsResponse.data);
      setPurchases(purchasesResponse.data);
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

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'dashboard', label: '📊 Tableau de bord' },
              { id: 'users', label: '👥 Utilisateurs' },
              { id: 'activity', label: '📈 Activité' },
              { id: 'server', label: '🖥️ Serveur' },
              { id: 'shop', label: '🛒 Boutique' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`modern-button ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.total_users}</div>
              <div className="stat-label">Utilisateurs totaux</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.active_users_today}</div>
              <div className="stat-label">Actifs aujourd'hui</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.server_status.players_online}</div>
              <div className="stat-label">Joueurs connectés</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.total_revenue.toFixed(2)}€</div>
              <div className="stat-label">Revenus boutique</div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="modern-card">
            <h3 className="text-2xl font-semibold mb-6">👥 Gestion des Utilisateurs</h3>
            <div className="modern-table">
              <table>
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>UUID</th>
                    <th>Statut</th>
                    <th>Connexions</th>
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
                      <td>{userData.login_count || 0}</td>
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
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && activity && (
          <div className="space-y-8">
            <div className="modern-card">
              <h3 className="text-2xl font-semibold mb-6">📈 Activité des Utilisateurs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Connexions récentes</h4>
                  <div className="space-y-2">
                    {activity.login_logs.slice(0, 10).map(log => (
                      <div key={log.id} className="info-item">
                        <span>{log.minecraft_username}</span>
                        <span className="text-sm text-secondary">
                          {new Date(log.login_time).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Utilisateurs les plus actifs</h4>
                  <div className="space-y-2">
                    {activity.user_stats.slice(0, 10).map(userStat => (
                      <div key={userStat._id} className="info-item">
                        <span>{userStat.minecraft_username}</span>
                        <span className="text-sm text-secondary">
                          {userStat.login_count} connexions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Server Tab */}
        {activeTab === 'server' && serverLogs && (
          <div className="modern-card">
            <h3 className="text-2xl font-semibold mb-6">🖥️ Logs du Serveur</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="stat-card">
                <div className="stat-number">{serverLogs.statistics.avg_players}</div>
                <div className="stat-label">Joueurs moyens</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{serverLogs.statistics.avg_latency}ms</div>
                <div className="stat-label">Latence moyenne</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{serverLogs.statistics.total_logs}</div>
                <div className="stat-label">Logs enregistrés</div>
              </div>
            </div>
            <div className="modern-table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Joueurs</th>
                    <th>Latence</th>
                  </tr>
                </thead>
                <tbody>
                  {serverLogs.logs.slice(0, 20).map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                      <td>{log.players_online}</td>
                      <td>{log.latency}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="modern-card">
            <h3 className="text-2xl font-semibold mb-6">🛒 Gestion Boutique</h3>
            <div className="modern-table">
              <table>
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Acheteur</th>
                    <th>Prix</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map(purchase => (
                    <tr key={purchase.id}>
                      <td>{purchase.item_name}</td>
                      <td>{purchase.user_id}</td>
                      <td>{purchase.price}€</td>
                      <td>
                        <span className={purchase.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}>
                          {purchase.status}
                        </span>
                      </td>
                      <td>{new Date(purchase.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
            <Route path="/shop" element={<Shop />} />
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