import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import "./ToyCollectionPage.css";

// Define the 1GB free tier limit in bytes (1024 * 1024 * 1024)
const STORAGE_LIMIT_BYTES = 1073741824; 

// Helper to format bytes into MB or GB
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function ToyCollectionPage({ onLogout }) {
  const [toys, setToys] = useState([]);
  const [filteredToys, setFilteredToys] = useState([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalToys: 0,
    monthlyToys: 0,
    totalValue: 0,
    recentAdditions: 0,
  });
  
  const [bucketStorageUsed, setBucketStorageUsed] = useState(null); 
  const [databaseStorageUsed, setDatabaseStorageUsed] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }

    const fetchBucketStorageUsage = async () => {
      try {
        const { data, error } = await supabase.rpc('get_bucket_storage_usage', { 
            bucket_name: 'toy-images'
        });

        if (!error && data !== null) {
          setBucketStorageUsed(data);
        } else {
          console.error("Error fetching bucket storage usage:", error);
          setBucketStorageUsed(0); 
        }
      } catch (e) {
        console.error("RPC call failed:", e);
        setBucketStorageUsed(0); 
      }
    };

    const fetchDatabaseStorageUsage = async () => {
      try {
        const { data: dbData, error: dbError } = await supabase.rpc('get_database_size');
        
        if (!dbError && dbData) {
          setDatabaseStorageUsed(dbData);
        } else {
          console.log("Using fallback database size estimation");
          setDatabaseStorageUsed(5000000);
        }
      } catch (e) {
        console.error("Error fetching database size:", e);
        setDatabaseStorageUsed(5000000);
      }
    };

    fetchUserData();
    fetchBucketStorageUsage();
    fetchDatabaseStorageUsage();

    const intervalId = setInterval(() => {
      fetchBucketStorageUsage();
      fetchDatabaseStorageUsage();
    }, 60000); 
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchToysAndStats = async () => {
      const { data, error } = await supabase
        .from("toys")
        .select(
          `
          id,
          name,
          primary_image_url,
          created_at,
          price,
          series,
          type,
          toy_images ( image_url )
          `
        )
        .order("created_at", { ascending: false });

      if (!error) {
        const formatted = data.map((toy) => ({
          id: toy.id,
          name: toy.name,
          image: toy.primary_image_url || null,
          additionalImages: toy.toy_images || [],
          price: toy.price,
          series: toy.series,
          type: toy.type,
          created_at: toy.created_at
        }));
        setToys(formatted);
        setFilteredToys(formatted);
        calculateStats(data);
      } else {
        console.error("Error fetching toys:", error);
      }
    };

    fetchToysAndStats();
  }, []);

  const calculateStats = (toysData) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const monthlyToys = toysData.filter(toy => 
      new Date(toy.created_at) >= startOfMonth
    ).length;

    const recentToys = toysData.filter(toy => 
      new Date(toy.created_at) >= startOfWeek
    ).length;

    const totalValue = toysData.reduce((sum, toy) => 
      sum + (parseFloat(toy.price) || 0), 0
    );

    setStats({
      totalToys: toysData.length,
      monthlyToys,
      totalValue,
      recentAdditions: recentToys
    });
  };

  useEffect(() => {
    const results = toys.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredToys(results);
  }, [search, toys]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out of ToyVerse?")) {
      await supabase.auth.signOut();
      if (onLogout) onLogout();
    }
  };

  const handleViewToy = (toyId) => {
    navigate(`/toy/${toyId}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTypeBadgeColor = (type) => {
    const typeColors = {
      'funko pop': '#ff4d4d',
      'pop': '#ff4d4d',
      'hotwheels': '#33ccff',
      'lego': '#ffcc00',
      'figure': '#94ff33',
      'action figure': '#94ff33',
      'plush': '#ff6b6b',
      'model': '#cc99ff',
      'collectible': '#ff9966',
      'gundam': '#ff6666',
      'nendoroid': '#66ccff'
    };
    
    const lowerType = type?.toLowerCase() || '';
    return typeColors[lowerType] || '#666666';
  };

  const StorageStatusModal = () => {
    const bucketPercentUsed = bucketStorageUsed !== null 
      ? ((bucketStorageUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(2) 
      : 0;
    
    const databasePercentUsed = databaseStorageUsed !== null 
      ? ((databaseStorageUsed / STORAGE_LIMIT_BYTES) * 100).toFixed(2) 
      : 0;

    const isBucketCloseToLimit = parseFloat(bucketPercentUsed) > 80;
    const isDatabaseCloseToLimit = parseFloat(databasePercentUsed) > 80;

    return (
      <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
        <div className="storage-modal-content" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">
            👤 MISSION STATUS REPORT ⚙️
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
              User ID: <span style={{ color: '#ff4d4d', wordBreak: 'break-all' }}>{user ? user.id.substring(0, 8) + '...' : 'N/A'}</span>
            </p>
            <p style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Email: <span style={{ color: '#33ccff', wordBreak: 'break-all' }}>{user ? user.email : 'N/A'}</span>
            </p>
          </div>

          {/* Bucket Storage Section */}
          <div className="storage-section">
            <h3 className="storage-title" style={{ color: isBucketCloseToLimit ? '#ff4d4d' : '#000' }}>
              🖼️ IMAGE STORAGE: {isBucketCloseToLimit ? 'CRITICAL!' : 'OK'}
            </h3>
            
            {bucketStorageUsed !== null ? (
              <>
                <p className="storage-usage">
                  USAGE: <span style={{ color: '#000' }}>{formatBytes(bucketStorageUsed)}</span> / {formatBytes(STORAGE_LIMIT_BYTES)}
                </p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${bucketPercentUsed}%`,
                      backgroundColor: isBucketCloseToLimit ? '#ff4d4d' : '#33ccff',
                    }}
                  ></div>
                  <span className="progress-text">
                    {bucketPercentUsed}% USED
                  </span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '14px' }}>...Loading bucket storage...</p>
            )}
          </div>

          {/* Database Storage Section */}
          <div className="storage-section">
            <h3 className="storage-title" style={{ color: isDatabaseCloseToLimit ? '#ff4d4d' : '#000' }}>
              🗄️ DATABASE STORAGE: {isDatabaseCloseToLimit ? 'CRITICAL!' : 'OK'}
            </h3>
            
            {databaseStorageUsed !== null ? (
              <>
                <p className="storage-usage">
                  USAGE: <span style={{ color: '#000' }}>{formatBytes(databaseStorageUsed)}</span> / {formatBytes(STORAGE_LIMIT_BYTES)}
                </p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${databasePercentUsed}%`,
                      backgroundColor: isDatabaseCloseToLimit ? '#ff4d4d' : '#94ff33',
                    }}
                  ></div>
                  <span className="progress-text">
                    {databasePercentUsed}% USED
                  </span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '14px' }}>...Loading database storage...</p>
            )}
          </div>

          {/* Total Usage Summary */}
          <div className="total-usage">
            <p className="total-usage-text">
              🚀 TOTAL USAGE: {formatBytes((bucketStorageUsed || 0) + (databaseStorageUsed || 0))} / {formatBytes(STORAGE_LIMIT_BYTES)}
            </p>
          </div>
          
          <button className="logout-button" onClick={handleLogout}>
            ❌ TERMINATE SESSION (LOGOUT)
          </button>
          
          <button className="modal-close-button" onClick={() => setIsModalOpen(false)}>
            X
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="toy-collection-page">
      {/* Header */}
      <header className="toy-collection-header">
        <h1 className="toy-collection-title">
          <span style={{color: '#ff4d4d'}}>💥</span> ToyVerse
        </h1>

        <button
          className="user-status-button"
          onClick={() => setIsModalOpen(true)}
          title="User & Storage Status"
        >
          👤
          {bucketStorageUsed !== null && databaseStorageUsed !== null && (
            <span 
              className="usage-badge"
              style={{
                background: ((bucketStorageUsed + databaseStorageUsed) / STORAGE_LIMIT_BYTES) > 0.8 ? '#ffcc00' : '#94ff33'
              }}
              title={`${(((bucketStorageUsed + databaseStorageUsed) / STORAGE_LIMIT_BYTES) * 100).toFixed(0)}% Total Used`}
            >
              %
            </span>
          )}
        </button>
      </header>
      
      {/* Storage Status Modal */}
      {isModalOpen && <StorageStatusModal />}

      {/* Stats Section */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stats-card" style={{ background: '#ffcc00' }}>
            <div className="stats-card-icon">🎯</div>
            <div className="stats-card-value">{stats.totalToys}</div>
            <div className="stats-card-label">TOTAL TOYS</div>
          </div>
          <div className="stats-card" style={{ background: '#33ccff' }}>
            <div className="stats-card-icon">📈</div>
            <div className="stats-card-value">{stats.monthlyToys}</div>
            <div className="stats-card-label">THIS MONTH</div>
          </div>
          <div className="stats-card" style={{ background: '#ff6b6b' }}>
            <div className="stats-card-icon">🚀</div>
            <div className="stats-card-value">{stats.recentAdditions}</div>
            <div className="stats-card-label">LAST 7 DAYS</div>
          </div>
          <div className="stats-card" style={{ background: '#94ff33' }}>
            <div className="stats-card-icon">💰</div>
            <div className="stats-card-value">{formatCurrency(stats.totalValue)}</div>
            <div className="stats-card-label">TOTAL VALUE</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="🔍 Search toys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Results Count */}
      {search && (
        <div className="results-count">
          <span className="results-text">
            🎯 {filteredToys.length} toy{filteredToys.length !== 1 ? 's' : ''} found for "{search}"
          </span>
        </div>
      )}

      {/* Toy List */}
      <div className="toy-grid">
        {filteredToys.map((toy) => (
          <div
            key={toy.id}
            className="toy-card"
            onClick={() => handleViewToy(toy.id)}
          >
            <div className="toy-image-container">
              {toy.image ? (
                <div className="toy-image">
                  <img
                    src={toy.image}
                    alt={toy.name}
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/200x200/ffcc00/000?text=No+Image';
                    }}
                  />
                </div>
              ) : (
                <div className="toy-image-placeholder">
                  NO IMAGE!
                </div>
              )}
              {toy.type && (
                <div
                  className="type-badge"
                  style={{ background: getTypeBadgeColor(toy.type) }}
                >
                  {toy.type}
                </div>
              )}
            </div>
            
            <h3 className="toy-name">
              {toy.name}
            </h3>

            {toy.series && (
              <div className="series-badge">
                📺 {toy.series}
              </div>
            )}

            {toy.additionalImages && toy.additionalImages.length > 0 && (
              <div className="images-count-badge">
                📸 +{toy.additionalImages.length} more
              </div>
            )}

            <button
              className="view-button"
              onClick={(e) => {
                e.stopPropagation();
                handleViewToy(toy.id);
              }}
            >
              VIEW!
            </button>
          </div>
        ))}
      </div>

      {/* Floating Add Toy Button */}
      <button
        className="add-toy-button"
        onClick={() => navigate("/add-toy")}
        title="Add New Toy"
      >
        +
      </button>
    </div>
  );
}