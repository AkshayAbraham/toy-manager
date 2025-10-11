import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import { getTypeBadgeColor } from "./colorUtils";
import "./ToyCollectionPage.css";
import FilterSidebar from './FilterPanel';

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
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    type: "",
    series: "",
    brand: "",
    condition: "",
    minPrice: "",
    maxPrice: "",
    priceRange: [0, 1000],
    hasImages: false,
    colorVariant: "",
    purchaseLocation: "",
    tags: [],
    dateRange: {
      startDate: "",
      endDate: ""
    },
    specificDate: "",
    month: "",
    year: "",
    sortBy: "newest" // Default sorting - not considered a filter
  });

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
      const { data: toysData, error } = await supabase
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
          brand,
          condition,
          color_variant,
          purchase_location,
          purchase_date,
          toy_images ( image_url ),
          toy_labels ( labels ( name ) )
          `
        )
        .order("created_at", { ascending: false }); // Default sorting from database

      if (!error) {
        const formatted = toysData.map((toy) => ({
          id: toy.id,
          name: toy.name,
          image: toy.primary_image_url || null,
          additionalImages: toy.toy_images || [],
          price: toy.price,
          series: toy.series,
          type: toy.type,
          brand: toy.brand,
          condition: toy.condition,
          colorVariant: toy.color_variant,
          purchaseLocation: toy.purchase_location,
          purchaseDate: toy.purchase_date,
          tags: toy.toy_labels ? toy.toy_labels.map(tl => tl.labels?.name).filter(Boolean) : [],
          created_at: toy.created_at
        }));
        setToys(formatted);
        setFilteredToys(formatted);
        calculateStats(toysData);
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

  // Get unique values for filter dropdowns
  const getUniqueValues = (field) => {
    return [...new Set(toys.map(toy => toy[field]).filter(Boolean))].sort();
  };

  // Get unique tags
  const getUniqueTags = () => {
    const allTags = toys.flatMap(toy => toy.tags || []);
    return [...new Set(allTags)].sort();
  };

  // Get unique years and months
  const getUniqueYears = () => {
    const years = toys.map(toy => {
      if (toy.purchaseDate) {
        return new Date(toy.purchaseDate).getFullYear();
      }
      return null;
    }).filter(Boolean);
    return [...new Set(years)].sort((a, b) => b - a);
  };

  const getUniqueMonths = () => {
    const months = toys.map(toy => {
      if (toy.purchaseDate) {
        return new Date(toy.purchaseDate).toLocaleString('default', { month: 'long' });
      }
      return null;
    }).filter(Boolean);
    return [...new Set(months)].sort();
  };

  // Apply filters and sorting
  useEffect(() => {
    let results = toys.filter((toy) =>
      toy.name.toLowerCase().includes(search.toLowerCase())
    );

    // Apply all active filters
    if (filters.type) {
      results = results.filter(toy => toy.type === filters.type);
    }
    if (filters.series) {
      results = results.filter(toy => toy.series === filters.series);
    }
    if (filters.brand) {
      results = results.filter(toy => toy.brand === filters.brand);
    }
    if (filters.condition) {
      results = results.filter(toy => toy.condition === filters.condition);
    }
    if (filters.minPrice) {
      results = results.filter(toy => parseFloat(toy.price || 0) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      results = results.filter(toy => parseFloat(toy.price || 0) <= parseFloat(filters.maxPrice));
    }
    if (filters.hasImages) {
      results = results.filter(toy => toy.image || (toy.additionalImages && toy.additionalImages.length > 0));
    }
    if (filters.colorVariant) {
      results = results.filter(toy => toy.colorVariant === filters.colorVariant);
    }
    if (filters.purchaseLocation) {
      results = results.filter(toy => toy.purchaseLocation === filters.purchaseLocation);
    }
    if (filters.tags.length > 0) {
      results = results.filter(toy => 
        filters.tags.some(tag => toy.tags.includes(tag))
      );
    }

    // Date filters
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      results = results.filter(toy => {
        if (!toy.purchaseDate) return false;
        const purchaseDate = new Date(toy.purchaseDate);
        const startDate = new Date(filters.dateRange.startDate);
        const endDate = new Date(filters.dateRange.endDate);
        return purchaseDate >= startDate && purchaseDate <= endDate;
      });
    }

    if (filters.specificDate) {
      results = results.filter(toy => {
        if (!toy.purchaseDate) return false;
        return toy.purchaseDate === filters.specificDate;
      });
    }

    if (filters.month) {
      results = results.filter(toy => {
        if (!toy.purchaseDate) return false;
        const purchaseMonth = new Date(toy.purchaseDate).toLocaleString('default', { month: 'long' });
        return purchaseMonth === filters.month;
      });
    }

    if (filters.year) {
      results = results.filter(toy => {
        if (!toy.purchaseDate) return false;
        const purchaseYear = new Date(toy.purchaseDate).getFullYear();
        return purchaseYear.toString() === filters.year;
      });
    }

    // Apply sorting from filters (default is "newest")
    const sortedResults = [...results].sort((a, b) => {
      switch (filters.sortBy) {
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "price-high-low":
          return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        case "price-low-high":
          return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case "newest":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    setFilteredToys(sortedResults);
  }, [search, toys, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleDateRangeChange = (rangeType, value) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [rangeType]: value
      }
    }));
  };

  const handleTagChange = (tag, isChecked) => {
    setFilters(prev => ({
      ...prev,
      tags: isChecked 
        ? [...prev.tags, tag]
        : prev.tags.filter(t => t !== tag)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      type: "",
      series: "",
      brand: "",
      condition: "",
      minPrice: "",
      maxPrice: "",
      priceRange: [0, 1000],
      hasImages: false,
      colorVariant: "",
      purchaseLocation: "",
      tags: [],
      dateRange: {
        startDate: "",
        endDate: ""
      },
      specificDate: "",
      month: "",
      year: "",
      sortBy: "newest" // Reset to default sorting
    });
    setSearch("");
  };

  const handleRemoveFilter = (filterName, value) => {
    if (filterName === 'tags') {
      handleTagChange(value, false);
    } else if (filterName === 'dateRange') {
      handleFilterChange('dateRange', { startDate: "", endDate: "" });
    } else {
      handleFilterChange(filterName, value);
    }
  };

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

  // Active filters count (excluding sortBy and default "newest" value)
// ✅ Only count *real* filters, not sortBy or defaults
const getActiveFiltersCount = (filters) => {
  // List all keys that count as actual filters
  const realFilterKeys = [
    "type",
    "series",
    "brand",
    "condition",
    "colorVariant",
    "purchaseLocation",
    "minPrice",
    "maxPrice",
    "dateRange",
    "specificDate",
    "month",
    "year",
    "tags",
    "hasImages"
  ];

  let count = 0;

  for (const key of realFilterKeys) {
    const value = filters[key];

    if (!value) continue;

    // For objects like dateRange
    if (typeof value === "object" && !Array.isArray(value)) {
      const hasValue = Object.values(value).some(v => v !== "");
      if (hasValue) count++;
      continue;
    }

    // For arrays like tags
    if (Array.isArray(value)) {
      if (value.length > 0) count++;
      continue;
    }

    // For regular string/boolean values
    if (value !== "" && value !== false) count++;
  }

  return count;
};

// 👇 Use this wherever you calculate activeFiltersCount
const activeFiltersCount = getActiveFiltersCount(filters);

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

      {/* Main Content with Sidebar */}
      <div className="main-content-wrapper">
        {/* Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onDateRangeChange={handleDateRangeChange}
          onTagChange={handleTagChange}
          onClearFilters={clearAllFilters}
          uniqueValues={{
            type: getUniqueValues('type'),
            series: getUniqueValues('series'),
            brand: getUniqueValues('brand'),
            condition: getUniqueValues('condition'),
            colorVariant: getUniqueValues('colorVariant'),
            purchaseLocation: getUniqueValues('purchaseLocation'),
            tags: getUniqueTags(),
            years: getUniqueYears(),
            months: getUniqueMonths()
          }}
          showFilters={showFilters}
          onClose={() => setShowFilters(false)}
        />

        {/* Main Content Area */}
        <div className="main-content">
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

          {/* Search Section Only - Removed Sort Section */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="🔍 Search toys by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              
              {/* Styled Filter Button */}
              <button
                className={`filter-toggle-button ${activeFiltersCount > 0 ? 'has-active-filters' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <span className="filter-icon">🎛️</span>
                FILTERS
                {activeFiltersCount > 0 && (
                  <span className="filter-count-badge">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="active-filters">
              <span className="active-filters-label">ACTIVE FILTERS:</span>
              {filters.type && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('type', '')}>
                  TYPE: {filters.type} ❌
                </span>
              )}
              {filters.series && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('series', '')}>
                  SERIES: {filters.series} ❌
                </span>
              )}
              {filters.brand && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('brand', '')}>
                  BRAND: {filters.brand} ❌
                </span>
              )}
              {filters.condition && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('condition', '')}>
                  CONDITION: {filters.condition} ❌
                </span>
              )}
              {filters.colorVariant && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('colorVariant', '')}>
                  COLOR: {filters.colorVariant} ❌
                </span>
              )}
              {filters.purchaseLocation && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('purchaseLocation', '')}>
                  STORE: {filters.purchaseLocation} ❌
                </span>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <span className="active-filter-tag" onClick={() => {
                  handleRemoveFilter('minPrice', '');
                  handleRemoveFilter('maxPrice', '');
                }}>
                  PRICE: ${filters.minPrice || '0'}-${filters.maxPrice || '∞'} ❌
                </span>
              )}
              {filters.hasImages && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('hasImages', false)}>
                  HAS IMAGES ❌
                </span>
              )}
              {filters.tags.map(tag => (
                <span key={tag} className="active-filter-tag" onClick={() => handleRemoveFilter('tags', tag)}>
                  TAG: {tag} ❌
                </span>
              ))}
              {(filters.dateRange.startDate || filters.dateRange.endDate) && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('dateRange', '')}>
                  DATE RANGE ❌
                </span>
              )}
              {filters.specificDate && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('specificDate', '')}>
                  DATE: {filters.specificDate} ❌
                </span>
              )}
              {filters.month && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('month', '')}>
                  MONTH: {filters.month} ❌
                </span>
              )}
              {filters.year && (
                <span className="active-filter-tag" onClick={() => handleRemoveFilter('year', '')}>
                  YEAR: {filters.year} ❌
                </span>
              )}
            </div>
          )}

          {/* Results Count */}
          {(search || activeFiltersCount > 0) && (
            <div className="results-count">
              <span className="results-text">
                🎯 {filteredToys.length} toy{filteredToys.length !== 1 ? 's' : ''} found
                {search && ` for "${search}"`}
                {activeFiltersCount > 0 && ` with ${activeFiltersCount} filter${activeFiltersCount !== 1 ? 's' : ''}`}
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
        </div>
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