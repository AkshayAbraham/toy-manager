import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import ToyForm from "./ToyForm";
import { useNavigate } from "react-router-dom";

export default function ToyCollectionPage({ onLogout }) {
  const [toys, setToys] = useState([]);
  const [filteredToys, setFilteredToys] = useState([]);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalToys: 0,
    monthlyToys: 0,
    totalValue: 0,
    recentAdditions: 0
  });
  const navigate = useNavigate();

  // Fetch toys and stats
  useEffect(() => {
    const fetchToysAndStats = async () => {
      // Fetch all toys
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

        // Calculate stats
        calculateStats(data);
      } else {
        console.error("Error fetching toys:", error);
      }
    };

    fetchToysAndStats();
  }, []);

  // Calculate statistics
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

  // Filter toys by search
  useEffect(() => {
    const results = toys.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredToys(results);
  }, [search, toys]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (onLogout) onLogout();
  };

  // View toy handler
  const handleViewToy = (toyId) => {
    console.log(`POW! Viewing details for toy ID: ${toyId}`);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get badge color based on type
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ff4d4d, #ffd633, #33ccff)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 12s ease infinite",
        paddingBottom: "80px",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 20px",
          background: "#fffbe6",
          borderBottom: "3px solid #000",
          boxShadow: "0 4px 0 #000",
        }}
      >
        <h1
          style={{
            fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
            fontSize: "clamp(22px, 5vw, 32px)",
            margin: 0,
            color: "#000",
          }}
        >
          <span style={{color: '#ff4d4d'}}>💥</span> ToyVerse
        </h1>

        <button
          onClick={handleLogout}
          style={{
            background: "#ff4d4d",
            border: "3px solid #000",
            borderRadius: "50%",
            width: '40px',
            height: '40px',
            lineHeight: '40px',
            textAlign: 'center',
            fontSize: "20px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "3px 3px 0 #000",
            transition: 'all 0.1s',
          }}
          title="Logout"
        >
          👤
        </button>
      </header>

      {/* Stats Section */}
      <div style={{ 
        padding: "15px 20px", 
        background: "#fffbe6",
        borderBottom: "3px solid #000"
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Total Toys */}
          <div style={{
            background: '#ffcc00',
            border: '3px solid #000',
            borderRadius: '12px',
            padding: '15px',
            textAlign: 'center',
            boxShadow: '4px 4px 0 #000',
            fontFamily: "'Comic Sans MS', cursive, sans-serif"
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              🎯
            </div>
            <div style={{ 
              fontSize: 'clamp(20px, 4vw, 24px)', 
              fontWeight: 'bold',
              fontFamily: "'Bangers', cursive",
              marginBottom: '5px'
            }}>
              {stats.totalToys}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              TOTAL TOYS
            </div>
          </div>

          {/* Monthly Toys */}
          <div style={{
            background: '#33ccff',
            border: '3px solid #000',
            borderRadius: '12px',
            padding: '15px',
            textAlign: 'center',
            boxShadow: '4px 4px 0 #000',
            fontFamily: "'Comic Sans MS', cursive, sans-serif"
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              📈
            </div>
            <div style={{ 
              fontSize: 'clamp(20px, 4vw, 24px)', 
              fontWeight: 'bold',
              fontFamily: "'Bangers', cursive",
              marginBottom: '5px'
            }}>
              {stats.monthlyToys}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              THIS MONTH
            </div>
          </div>

          {/* Recent Additions */}
          <div style={{
            background: '#ff6b6b',
            border: '3px solid #000',
            borderRadius: '12px',
            padding: '15px',
            textAlign: 'center',
            boxShadow: '4px 4px 0 #000',
            fontFamily: "'Comic Sans MS', cursive, sans-serif"
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              🚀
            </div>
            <div style={{ 
              fontSize: 'clamp(20px, 4vw, 24px)', 
              fontWeight: 'bold',
              fontFamily: "'Bangers', cursive",
              marginBottom: '5px'
            }}>
              {stats.recentAdditions}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              LAST 7 DAYS
            </div>
          </div>

          {/* Collection Value */}
          <div style={{
            background: '#94ff33',
            border: '3px solid #000',
            borderRadius: '12px',
            padding: '15px',
            textAlign: 'center',
            boxShadow: '4px 4px 0 #000',
            fontFamily: "'Comic Sans MS', cursive, sans-serif"
          }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
              💰
            </div>
            <div style={{ 
              fontSize: 'clamp(16px, 3vw, 20px)', 
              fontWeight: 'bold',
              fontFamily: "'Bangers', cursive",
              marginBottom: '5px'
            }}>
              {formatCurrency(stats.totalValue)}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              TOTAL VALUE
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: "15px 20px", background: "#fffbe6" }}>
        <input
          type="text"
          placeholder="🔍 Search toys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "3px solid #000",
            fontSize: "16px",
            fontFamily: "'Comic Sans MS', cursive, sans-serif",
            boxShadow: "3px 3px 0 #000",
            maxWidth: '500px',
            margin: '0 auto',
            display: 'block'
          }}
        />
      </div>

      {/* Results Count */}
      {search && (
        <div style={{
          padding: "10px 20px",
          background: "#fffbe6",
          textAlign: 'center',
          borderBottom: '2px dashed #000'
        }}>
          <span style={{
            fontFamily: "'Bangers', cursive",
            fontSize: '18px',
            color: '#ff4d4d'
          }}>
            🎯 {filteredToys.length} toy{filteredToys.length !== 1 ? 's' : ''} found for "{search}"
          </span>
        </div>
      )}

      {/* Toy List */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
          gap: "20px",
          padding: "20px",
        }}
      >
        {filteredToys.map((toy) => (
          <div
            key={toy.id}
            className="toy-card-item"
            onClick={() => handleViewToy(toy.id)}
            style={{
              background: "#fffbe6",
              border: "4px solid #000",
              borderRadius: "16px",
              boxShadow: "6px 6px 0 #000",
              padding: "10px",
              textAlign: "center",
              cursor: "pointer",
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            {/* Image Container with Badge */}
            <div style={{ position: 'relative', marginBottom: "10px" }}>
              {toy.image ? (
                <div 
                  style={{
                    width: "100%",
                    height: "140px",
                    borderRadius: "12px",
                    border: "2px solid #000",
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={toy.image}
                    alt={toy.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain", 
                      borderRadius: "10px", 
                    }}
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/200x200/ffcc00/000?text=No+Image';
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "140px",
                    borderRadius: "12px",
                    border: "2px dashed #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Bangers', cursive",
                    fontSize: "16px",
                    color: "#000",
                    flexShrink: 0,
                    backgroundColor: '#fff0f0',
                  }}
                >
                  NO IMAGE!
                </div>
              )}
              
              {/* Type Badge - Positioned on top of image */}
              {toy.type && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: getTypeBadgeColor(toy.type),
                    color: '#000',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    border: '2px solid #000',
                    fontFamily: "'Comic Sans MS', cursive",
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    zIndex: 2,
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  {toy.type}
                </div>
              )}
            </div>
            
            {/* Toy Name */}
            <h3
              style={{
                fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
                fontSize: "clamp(18px, 4vw, 24px)",
                margin: '0 0 8px 0',
                color: "#000",
                flexGrow: 1,
                lineHeight: '1.2'
              }}
            >
              {toy.name}
            </h3>

            {/* Series Name */}
            {toy.series && (
              <div style={{
                background: '#33ccff',
                color: '#000',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                marginBottom: '8px',
                border: '2px solid #000',
                fontFamily: "'Comic Sans MS', cursive",
              }}>
                📺 {toy.series}
              </div>
            )}

            {/* Additional Images Count */}
            {toy.additionalImages && toy.additionalImages.length > 0 && (
              <div
                style={{
                  background: '#ffcc00',
                  color: '#000',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  border: '2px solid #000',
                  fontFamily: "'Comic Sans MS', cursive",
                }}
              >
                📸 +{toy.additionalImages.length} more
              </div>
            )}

            {/* View Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewToy(toy.id);
              }}
              style={{
                background: "#33ccff",
                color: "#000",
                border: "3px solid #000",
                borderRadius: "8px",
                padding: "8px 0",
                marginTop: 'auto',
                fontSize: "18px",
                fontWeight: "bold",
                fontFamily: "'Bangers', cursive",
                cursor: "pointer",
                boxShadow: "3px 3px 0 #000",
                transition: 'all 0.1s',
              }}
            >
              VIEW!
            </button>
          </div>
        ))}
      </div>

      {/* Floating Add Toy Button */}
      <button
        onClick={() => navigate("/add-toy")}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#ffcc00",
          border: "3px solid #000",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          fontSize: "28px",
          fontWeight: "bold",
          boxShadow: "6px 6px 0 #000",
          cursor: "pointer",
          zIndex: 999,
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "8px 8px 0 #000";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = "6px 6px 0 #000";
        }}
        onMouseDown={(e) => {
          e.target.style.transform = "scale(0.95) translate(2px, 2px)";
          e.target.style.boxShadow = "4px 4px 0 #000";
        }}
        onMouseUp={(e) => {
          e.target.style.transform = "scale(1.1)";
          e.target.style.boxShadow = "8px 8px 0 #000";
        }}
        title="Add New Toy"
      >
        +
      </button>

      {/* Gradient animation and hover effect CSS */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          .toy-card-item:hover {
            transform: scale(1.05) rotate(-1deg);
            box-shadow: 10px 10px 0 #ff4d4d;
            z-index: 10;
          }
          
          .toy-card-item button:active {
            transform: translate(2px, 2px);
            box-shadow: 1px 1px 0 #000;
          }

          /* Stats cards hover effect */
          .stats-card:hover {
            transform: translateY(-2px);
            box-shadow: 6px 6px 0 #000;
          }
        `}
      </style>
    </div>
  );
}